const RESPONSE_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

export async function checkRateLimit(env, key = 'resolve-location') {
  if (!env?.API_RATE_LIMITER?.limit) {
    return {
      allowed: false,
      reason: 'RATE_LIMITER_BINDING_MISSING',
    };
  }

  const result = await env.API_RATE_LIMITER.limit({ key });

  return {
    allowed: Boolean(result?.success),
    reason: result?.success ? 'ALLOWED' : 'RATE_LIMITED',
  };
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return jsonResponse(
        {
          allowed: false,
          reason: 'METHOD_NOT_ALLOWED',
        },
        405
      );
    }

    const { allowed, reason } = await checkRateLimit(env, 'resolve-location');

    return jsonResponse(
      {
        allowed,
        reason,
      },
      allowed ? 200 : reason === 'RATE_LIMITED' ? 429 : 503
    );
  },
};
