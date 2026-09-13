const SHORT_HOST = 'maps.app.goo.gl';
const ALLOWED_GOOGLE_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'maps.google.com',
  SHORT_HOST,
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 6;

export class MapResolveError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'MapResolveError';
    this.code = code;
    this.status = status;
  }
}

export function validateCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new MapResolveError('INVALID_COORDINATES', '緯度経度が数値ではありません', 422);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new MapResolveError('INVALID_COORDINATES', '緯度経度が有効範囲外です', 422);
  }

  return { latitude: lat, longitude: lng };
}

function parseCoordinateText(value) {
  const match = String(value ?? '')
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return validateCoordinates(match[1], match[2]);
}

function assertHttpsGoogleHost(url, { shortOnly = false } = {}) {
  if (url.protocol !== 'https:') {
    throw new MapResolveError('UNSUPPORTED_URL', 'HTTPSのGoogle Maps URLのみ対応します');
  }
  const host = url.hostname.toLowerCase();
  if (!ALLOWED_GOOGLE_HOSTS.has(host)) {
    throw new MapResolveError('REDIRECT_HOST_NOT_ALLOWED', 'Google Maps以外のホストへは接続しません', 502);
  }
  if (shortOnly && host !== SHORT_HOST) {
    throw new MapResolveError('SHORT_URL_REQUIRED', 'Google Mapsの短縮共有URLを入力してください');
  }
  if (host !== SHORT_HOST && !url.pathname.startsWith('/maps')) {
    throw new MapResolveError('UNSUPPORTED_URL', 'Google Maps URLとして確認できません', 502);
  }
}

export function assertShortGoogleMapsUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new MapResolveError('INVALID_URL', 'URLとして読み取れません');
  }
  assertHttpsGoogleHost(url, { shortOnly: true });
  return url;
}

export function extractCoordinatesFromGoogleMapsUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new MapResolveError('INVALID_URL', 'URLとして読み取れません');
  }
  assertHttpsGoogleHost(url);

  const dataMatch = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dataMatch) {
    return {
      ...validateCoordinates(dataMatch[1], dataMatch[2]),
      sourceType: 'google-maps-place-data',
    };
  }

  for (const key of ['query', 'q', 'destination']) {
    const coordinates = parseCoordinateText(url.searchParams.get(key));
    if (coordinates) {
      return { ...coordinates, sourceType: `google-maps-${key}` };
    }
  }

  const viewportMatch = url.href.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|$)/);
  if (viewportMatch) {
    throw new MapResolveError(
      'VIEWPORT_ONLY',
      '地図の表示中心しか確認できないため、登録地点としては採用しません',
      422
    );
  }

  throw new MapResolveError(
    'COORDINATES_NOT_FOUND',
    'URLから確実な緯度経度を確認できませんでした',
    422
  );
}

export async function resolveShortGoogleMapsUrl(rawUrl, fetchImpl = globalThis.fetch) {
  const initial = assertShortGoogleMapsUrl(rawUrl);
  if (typeof fetchImpl !== 'function') {
    throw new MapResolveError('FETCH_UNAVAILABLE', '短縮URLを解決できません', 500);
  }

  let current = initial;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    let response;
    try {
      response = await fetchImpl(current.href, {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });
    } catch {
      throw new MapResolveError('UPSTREAM_FETCH_FAILED', 'Google Maps短縮URLを取得できませんでした', 502);
    }

    if (!REDIRECT_STATUSES.has(response.status)) {
      if (current.hostname !== SHORT_HOST) {
        return extractCoordinatesFromGoogleMapsUrl(current.href);
      }
      throw new MapResolveError('SHORT_URL_RESOLVE_FAILED', '短縮URLのリダイレクト先を確認できませんでした', 502);
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new MapResolveError('REDIRECT_LOCATION_MISSING', 'リダイレクト先を確認できませんでした', 502);
    }

    const next = new URL(location, current);
    assertHttpsGoogleHost(next);

    if (next.hostname !== SHORT_HOST) {
      try {
        return extractCoordinatesFromGoogleMapsUrl(next.href);
      } catch (error) {
        if (error?.code !== 'COORDINATES_NOT_FOUND') throw error;
      }
    }

    current = next;
  }

  throw new MapResolveError('TOO_MANY_REDIRECTS', 'リダイレクト回数が上限を超えました', 502);
}
