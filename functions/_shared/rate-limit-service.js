export class RateLimitServiceError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'RateLimitServiceError';
    this.code = code;
    this.status = status;
  }
}

export async function assertGoogleApiRateLimit(env) {
  const service = env?.RATE_LIMITER_SERVICE;

  if (!service || typeof service.fetch !== 'function') {
    throw new RateLimitServiceError(
      'RATE_LIMITER_UNAVAILABLE',
      '地点解決サービスを一時的に利用できません',
      503
    );
  }

  let response;
  try {
    response = await service.fetch(
      new Request('https://rate-limiter.internal/resolve-location', {
        method: 'POST',
      })
    );
  } catch {
    throw new RateLimitServiceError(
      'RATE_LIMITER_UNAVAILABLE',
      '地点解決サービスを一時的に利用できません',
      503
    );
  }

  if (response.status === 200) {
    return;
  }

  if (response.status === 429) {
    throw new RateLimitServiceError(
      'RATE_LIMITED',
      '短時間に地点確認が集中しています。少し時間を置いて再試行してください',
      429
    );
  }

  throw new RateLimitServiceError(
    'RATE_LIMITER_UNAVAILABLE',
    '地点解決サービスを一時的に利用できません',
    503
  );
}
