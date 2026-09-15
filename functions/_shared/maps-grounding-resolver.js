const RESOLVE_MAPS_URLS_ENDPOINT = 'https://mapstools.googleapis.com/v1alpha:resolveMapsUrls';
const MAX_URLS = 20;
const MAX_URL_LENGTH = 2048;

export class MapsGroundingError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.name = 'MapsGroundingError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function normalizeSupportedMapsUrl(rawUrl) {
  const value = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!value) {
    throw new MapsGroundingError('URL_REQUIRED', 'Google Maps共有リンクを入力してください');
  }
  if (value.length > MAX_URL_LENGTH) {
    throw new MapsGroundingError('URL_TOO_LONG', 'URLが長すぎます', 413);
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new MapsGroundingError('INVALID_URL', 'URL形式が正しくありません');
  }

  if (parsed.protocol !== 'https:') {
    throw new MapsGroundingError('HTTPS_REQUIRED', 'HTTPSのGoogle Maps URLのみ対応しています');
  }
  if (parsed.username || parsed.password) {
    throw new MapsGroundingError('CREDENTIALS_NOT_ALLOWED', '認証情報を含むURLは利用できません');
  }
  if (parsed.hostname !== 'maps.app.goo.gl') {
    throw new MapsGroundingError(
      'UNSUPPORTED_HOST',
      'PoCでは maps.app.goo.gl の短縮URLのみ対応しています'
    );
  }
  if (!parsed.pathname || parsed.pathname === '/') {
    throw new MapsGroundingError('INVALID_MAPS_URL', 'Google Maps短縮URLとして確認できません');
  }

  return parsed.toString();
}

export async function resolveMapsUrlsWithGoogle(urls, { apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) {
    throw new MapsGroundingError(
      'API_KEY_NOT_CONFIGURED',
      'Maps Grounding Lite APIキーが設定されていません',
      503
    );
  }
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new MapsGroundingError('URLS_REQUIRED', 'Google Maps URLが必要です');
  }
  if (urls.length > MAX_URLS) {
    throw new MapsGroundingError('TOO_MANY_URLS', '一度に解決できるURLは20件までです');
  }

  const normalizedUrls = urls.map(normalizeSupportedMapsUrl);
  let response;
  try {
    response = await fetchImpl(RESOLVE_MAPS_URLS_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({ urls: normalizedUrls }),
    });
  } catch (error) {
    throw new MapsGroundingError(
      'GOOGLE_REQUEST_FAILED',
      'Google Maps Tools APIへ接続できませんでした',
      502,
      { cause: error?.message ?? String(error) }
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Fall through and report a normalized upstream error below.
  }

  if (!response.ok) {
    throw new MapsGroundingError(
      'GOOGLE_API_ERROR',
      'Google Maps Tools APIがエラーを返しました',
      502,
      {
        httpStatus: response.status,
        upstreamStatus: payload?.error?.status ?? null,
        upstreamMessage: payload?.error?.message ?? null,
      }
    );
  }

  return {
    entities: Array.isArray(payload?.entities) ? payload.entities : [],
    failedRequests:
      payload?.failedRequests && typeof payload.failedRequests === 'object'
        ? payload.failedRequests
        : {},
  };
}
