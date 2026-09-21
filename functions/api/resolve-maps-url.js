import {
  MapsGroundingError,
  normalizeSupportedMapsUrl,
  resolveMapsUrlsWithGoogle,
} from '../_shared/maps-grounding-resolver.js';
import {
  API_RESPONSE_HEADERS,
  RequestSecurityError,
  assertSameOriginRequest,
} from '../_shared/request-security.js';
import {
  RateLimitServiceError,
  assertGoogleApiRateLimit,
} from '../_shared/rate-limit-service.js';

const MAX_BODY_BYTES = 8192;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: API_RESPONSE_HEADERS,
  });
}

function normalizeError(error) {
  if (
    error instanceof MapsGroundingError ||
    error instanceof RequestSecurityError ||
    error instanceof RateLimitServiceError
  ) {
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
        message: 'URL解決中に予期しないエラーが発生しました',
      },
    },
    500
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    assertSameOriginRequest(request);

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
    await assertGoogleApiRateLimit(env);

    const resolved = await resolveMapsUrlsWithGoogle([url], {
      apiKey: env?.MAPS_GROUNDING_API_KEY,
    });

    const entity = resolved.entities[0] ?? {};
    const failedRequest = resolved.failedRequests?.['0'] ?? null;

    if (!entity.place) {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: 'PLACE_NOT_RESOLVED',
            message: 'このGoogle Maps URLからPlace IDを解決できませんでした',
            ...(failedRequest
              ? {
                  details: {
                    googleCode: failedRequest.code ?? null,
                    googleMessage: failedRequest.message ?? null,
                  },
                }
              : {}),
          },
        },
        422
      );
    }

    return jsonResponse({
      ok: true,
      place: entity.place,
      placeId: entity.place.replace(/^places\//, ''),
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
