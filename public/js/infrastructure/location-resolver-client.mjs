import { isValidCoordinate } from '../core/coordinate-validator.mjs';

export class LocationResolverError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LocationResolverError';
    this.code = code;
  }
}

function assertSupportedMapsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'maps.app.goo.gl' || url.pathname === '/') {
      throw new Error('unsupported');
    }
    return url.toString();
  } catch {
    throw new LocationResolverError('UNSUPPORTED_URL', 'Google Mapsの共有URLを確認できません');
  }
}

export async function resolveLocationFromMapsUrl(mapsUrl, { fetchImpl = fetch } = {}) {
  const url = assertSupportedMapsUrl(mapsUrl);
  let response;

  try {
    response = await fetchImpl('/api/resolve-location', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new LocationResolverError('NETWORK_ERROR', '場所の確認中に通信できませんでした');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new LocationResolverError(
      body?.error?.code || 'RESOLVE_FAILED',
      body?.error?.message || 'Google Mapsの場所を確認できませんでした'
    );
  }

  if (!isValidCoordinate(body.latitude, body.longitude)) {
    throw new LocationResolverError('INVALID_RESPONSE', '取得した場所の座標を確認できませんでした');
  }

  return {
    latitude: body.latitude,
    longitude: body.longitude,
    placeId: typeof body.placeId === 'string' ? body.placeId : null,
  };
}
