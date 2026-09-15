const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places/';
const MAX_PLACE_ID_LENGTH = 256;
const PLACE_FIELDS = 'id,location';

export class PlacesDetailsError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.name = 'PlacesDetailsError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function normalizePlaceId(rawPlaceId) {
  const value = typeof rawPlaceId === 'string' ? rawPlaceId.trim() : '';
  if (!value) {
    throw new PlacesDetailsError('PLACE_ID_REQUIRED', 'Place IDが必要です');
  }

  const placeId = value.replace(/^places\//, '');
  if (!placeId || placeId.length > MAX_PLACE_ID_LENGTH || placeId.includes('/')) {
    throw new PlacesDetailsError('INVALID_PLACE_ID', 'Place ID形式が正しくありません');
  }

  return placeId;
}

export async function getPlaceLocation(placeId, { apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) {
    throw new PlacesDetailsError(
      'API_KEY_NOT_CONFIGURED',
      'Google Maps Platform APIキーが設定されていません',
      503
    );
  }

  const normalizedPlaceId = normalizePlaceId(placeId);
  let response;

  try {
    const url = new URL(`${PLACES_ENDPOINT}${encodeURIComponent(normalizedPlaceId)}`);
    // Google Places API (New)はFieldMask必須。Cloudflare Pages Function経由で
    // X-Goog-FieldMaskヘッダーが上流に認識されない実機事象があったため、
    // 公式にサポートされる fields URLパラメータを使用する。
    url.searchParams.set('fields', PLACE_FIELDS);

    response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });
  } catch (error) {
    throw new PlacesDetailsError(
      'PLACES_REQUEST_FAILED',
      'Places APIへ接続できませんでした',
      502,
      { cause: error?.message ?? String(error) }
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Normalize below.
  }

  if (!response.ok) {
    throw new PlacesDetailsError(
      'PLACES_API_ERROR',
      'Places APIがエラーを返しました',
      502,
      {
        httpStatus: response.status,
        upstreamStatus: payload?.error?.status ?? null,
        upstreamMessage: payload?.error?.message ?? null,
      }
    );
  }

  const latitude = Number(payload?.location?.latitude);
  const longitude = Number(payload?.location?.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new PlacesDetailsError(
      'LOCATION_NOT_RETURNED',
      'Places APIから有効な緯度経度が返りませんでした',
      422
    );
  }

  return {
    placeId: typeof payload?.id === 'string' && payload.id ? payload.id : normalizedPlaceId,
    latitude,
    longitude,
  };
}
