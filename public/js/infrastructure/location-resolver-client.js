export class LocationResolverClientError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'LocationResolverClientError';
    this.code = code;
    this.status = status;
  }
}

export async function resolveLocationFromMapsUrl(
  mapsUrl,
  { fetchImpl = fetch } = {}
) {
  let response;
  try {
    response = await fetchImpl('/api/resolve-location', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ url: mapsUrl }),
    });
  } catch {
    throw new LocationResolverClientError(
      'NETWORK_ERROR',
      '地点確認サービスへ接続できませんでした'
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new LocationResolverClientError(
      body?.error?.code ?? 'RESOLVE_FAILED',
      body?.error?.message ?? '地点を確認できませんでした',
      response.status
    );
  }

  return {
    latitude: body.latitude,
    longitude: body.longitude,
  };
}
