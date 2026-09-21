import assert from 'node:assert/strict';
import {
  RateLimitServiceError,
  assertGoogleApiRateLimit,
} from '../functions/_shared/rate-limit-service.js';

async function expectError(env, code, status) {
  await assert.rejects(
    () => assertGoogleApiRateLimit(env),
    (error) => {
      assert.ok(error instanceof RateLimitServiceError);
      assert.equal(error.code, code);
      assert.equal(error.status, status);
      return true;
    }
  );
}

{
  let called = 0;
  const env = {
    RATE_LIMITER_SERVICE: {
      async fetch(request) {
        called += 1;
        assert.equal(request.method, 'POST');
        assert.equal(new URL(request.url).hostname, 'rate-limiter.internal');
        return new Response(
          JSON.stringify({ allowed: true, reason: 'ALLOWED' }),
          { status: 200 }
        );
      },
    },
  };

  await assert.doesNotReject(() => assertGoogleApiRateLimit(env));
  assert.equal(called, 1);
}

await expectError(
  {
    RATE_LIMITER_SERVICE: {
      async fetch() {
        return new Response(
          JSON.stringify({ allowed: false, reason: 'RATE_LIMITED' }),
          { status: 429 }
        );
      },
    },
  },
  'RATE_LIMITED',
  429
);

await expectError({}, 'RATE_LIMITER_UNAVAILABLE', 503);

await expectError(
  {
    RATE_LIMITER_SERVICE: {
      async fetch() {
        throw new Error('service unavailable');
      },
    },
  },
  'RATE_LIMITER_UNAVAILABLE',
  503
);

await expectError(
  {
    RATE_LIMITER_SERVICE: {
      async fetch() {
        return new Response('unexpected', { status: 500 });
      },
    },
  },
  'RATE_LIMITER_UNAVAILABLE',
  503
);

console.log('rate limit service tests: OK');
