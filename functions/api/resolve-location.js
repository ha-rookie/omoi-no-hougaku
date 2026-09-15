import {
  MapsGroundingError,
  normalizeSupportedMapsUrl,
  resolveMapsUrlsWithGoogle,
} from '../_shared/maps-grounding-resolver.js';
import {
  PlacesDetailsError,
  getPlaceLocation,
} from '../_shared/places-details.js';

const MAX_BODY_BYTES = 8192;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  });
}

function assertSameOriginWhenPresent(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;

  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin) {
    throw new MapsGroundingError(
      'CROSS_ORIGIN_NOT_ALLOWED',
      'このAPIは同一サイトからのみ利用できます',
      403
    );
  }
}

function normalizeError(error) {
  if (error instanceof MapsGroundingError || error instanceof PlacesDetailsError) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      error.status
    );
  }

  return jsonResponse(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '地点解決中に予期しないエラーが発生しました',
      },
    },
    500
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    assertSameOriginWhenPresent(request);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      throw new MapsGroundingError('REQUEST_TOO_LARGE', '入力が大きすぎます', 413);
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new MapsGroundingError('JSON_REQUIRED', 'JSON形式で送信してください', 415);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      throw new MapsGroundingError('INVALID_JSON', 'JSONを読み取れません');
    }

    const url = normalizeSupportedMapsUrl(body?.url);
    const apiKey = env?.MAPS_GROUNDING_API_KEY;

    const resolved = await resolveMapsUrlsWithGoogle([url], { apiKey });
    const entity = resolved.entities[0] ?? {};
    const failedRequest = resolved.failedRequests?.['0'] ?? null;

    if (!entity.place) {
      throw new MapsGroundingError(
        'PLACE_NOT_RESOLVED',
        'このGoogle Maps URLからPlace IDを解決できませんでした',
        422,
        failedRequest
          ? {
              googleCode: failedRequest.code ?? null,
              googleMessage: failedRequest.message ?? null,
            }
          : null
      );
    }

    const location = await getPlaceLocation(entity.place, { apiKey });

    return jsonResponse({
      ok: true,
      place: entity.place,
      placeId: location.placeId,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  } catch (error) {
    return normalizeError(error);
  }
}

export function onRequest(context) {
  if (context.request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'POSTのみ対応しています',
        },
      },
      405
    );
  }

  return onRequestPost(context);
}
