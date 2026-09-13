const SHORT_HOST = 'maps.app.goo.gl';

export class PlaceInputError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PlaceInputError';
    this.code = code;
    this.details = details;
  }
}

export function validateCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new PlaceInputError('INVALID_COORDINATES', '緯度経度が数値ではありません');
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new PlaceInputError('INVALID_COORDINATES', '緯度経度が有効範囲外です');
  }

  return { latitude: lat, longitude: lng };
}

export function parseCoordinateText(input) {
  const match = String(input)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) return null;
  return validateCoordinates(match[1], match[2]);
}

function isGoogleHost(hostname) {
  const host = hostname.toLowerCase();
  return host === 'google.com' || host.endsWith('.google.com') || host === SHORT_HOST;
}

export function assertAllowedGoogleMapsUrl(rawUrl) {
  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new PlaceInputError('INVALID_URL', 'URLとして読み取れません');
  }

  if (url.protocol !== 'https:') {
    throw new PlaceInputError('UNSUPPORTED_URL', 'HTTPSのGoogle Maps URLのみ対応します');
  }

  if (!isGoogleHost(url.hostname)) {
    throw new PlaceInputError('UNSUPPORTED_URL', 'Google Maps以外のURLには対応していません');
  }

  if (url.hostname !== SHORT_HOST && !url.pathname.startsWith('/maps')) {
    throw new PlaceInputError('UNSUPPORTED_URL', 'Google Maps URLとして確認できません');
  }

  return url;
}

function candidate(latitude, longitude, sourceType, resolvedUrl) {
  const coordinates = validateCoordinates(latitude, longitude);
  return {
    ...coordinates,
    sourceType,
    resolvedUrl,
  };
}

function coordinateFromParam(url, key) {
  const value = url.searchParams.get(key);
  if (!value) return null;
  return parseCoordinateText(value);
}

export function extractCoordinatesFromGoogleMapsUrl(rawUrl) {
  const url = assertAllowedGoogleMapsUrl(rawUrl);

  if (url.hostname === SHORT_HOST) {
    throw new PlaceInputError(
      'SHORT_URL_NEEDS_RESOLUTION',
      '短縮URLはリダイレクト先の確認が必要です'
    );
  }

  // Place詳細の data 部分に含まれる !3d<lat>!4d<lng> を最優先する。
  // @lat,lng は単なる地図の表示中心になり得るため、登録地点としては採用しない。
  const dataMatch = url.href.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dataMatch) {
    return candidate(
      dataMatch[1],
      dataMatch[2],
      'google-maps-place-data',
      url.href
    );
  }

  for (const key of ['query', 'q', 'destination']) {
    const coordinates = coordinateFromParam(url, key);
    if (coordinates) {
      return candidate(
        coordinates.latitude,
        coordinates.longitude,
        `google-maps-${key}`,
        url.href
      );
    }
  }

  const viewportMatch = url.href.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|$)/
  );

  if (viewportMatch) {
    const viewport = validateCoordinates(viewportMatch[1], viewportMatch[2]);
    throw new PlaceInputError(
      'VIEWPORT_ONLY',
      '地図の表示中心しか確認できないため、登録地点としては採用しません',
      { viewport }
    );
  }

  throw new PlaceInputError(
    'COORDINATES_NOT_FOUND',
    'URLから確実な緯度経度を確認できませんでした'
  );
}

export async function resolveGoogleMapsInput(input, options = {}) {
  const normalized = String(input ?? '').trim();

  if (!normalized) {
    throw new PlaceInputError(
      'EMPTY_INPUT',
      'Google Mapsの共有リンクを入力してください'
    );
  }

  const manualCoordinates = parseCoordinateText(normalized);
  if (manualCoordinates) {
    return {
      ...manualCoordinates,
      sourceType: 'coordinate-text',
      resolvedUrl: null,
    };
  }

  const url = assertAllowedGoogleMapsUrl(normalized);
  if (url.hostname !== SHORT_HOST) {
    return extractCoordinatesFromGoogleMapsUrl(url.href);
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new PlaceInputError(
      'SHORT_URL_RESOLVE_UNAVAILABLE',
      'この環境では短縮URLを解決できません'
    );
  }

  let response;
  try {
    response = await fetchImpl(url.href, {
      method: 'GET',
      redirect: 'follow',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
  } catch (error) {
    throw new PlaceInputError(
      'SHORT_URL_BROWSER_BLOCKED',
      'ブラウザからGoogle Maps短縮URLのリダイレクト先を取得できませんでした',
      { cause: String(error?.message ?? error) }
    );
  }

  if (!response?.url || response.url === url.href) {
    throw new PlaceInputError(
      'SHORT_URL_RESOLVE_FAILED',
      '短縮URLのリダイレクト先を確認できませんでした'
    );
  }

  return extractCoordinatesFromGoogleMapsUrl(response.url);
}
