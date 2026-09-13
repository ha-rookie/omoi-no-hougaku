import {
  MapResolveError,
  resolveShortGoogleMapsUrl,
} from '../_shared/google-maps-resolver.js';

const MAX_BODY_BYTES = 8192;
const MAX_URL_LENGTH = 2048;

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

function errorResponse(error) {
  if (error instanceof MapResolveError) {
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
        message: '地点を読み取れませんでした',
      },
    },
    500
  );
}

function assertSameOriginWhenPresent(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;

  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin) {
    throw new MapResolveError(
      'CROSS_ORIGIN_NOT_ALLOWED',
      'このAPIは同一サイトからのみ利用できます',
      403
    );
  }
}

export async function onRequestPost(context) {
  const { request } = context;

  try {
    assertSameOriginWhenPresent(request);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      throw new MapResolveError('REQUEST_TOO_LARGE', '入力が大きすぎます', 413);
    }

    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new MapResolveError('JSON_REQUIRED', 'JSON形式で送信してください', 415);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      throw new MapResolveError('INVALID_JSON', 'JSONを読み取れません', 400);
    }

    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!rawUrl) {
      throw new MapResolveError('URL_REQUIRED', 'Google Maps共有リンクを入力してください');
    }
    if (rawUrl.length > MAX_URL_LENGTH) {
      throw new MapResolveError('URL_TOO_LONG', 'URLが長すぎます', 413);
    }

    const resolved = await resolveShortGoogleMapsUrl(rawUrl);

    return jsonResponse({
      ok: true,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      sourceType: resolved.sourceType,
    });
  } catch (error) {
    return errorResponse(error);
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
