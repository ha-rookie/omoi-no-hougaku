import assert from 'node:assert/strict';
import worker, {
  checkRateLimit,
} from '../workers/api-rate-limiter/src/index.js';

const request = new Request('https://rate-limiter.internal/resolve-location', {
  method: 'POST',
});

{
  let seenKey = null;
  const env = {
    API_RATE_LIMITER: {
      async limit({ key }) {
        seenKey = key;
        return { success: true };
      },
    },
  };

  const result = await checkRateLimit(env);
  assert.deepEqual(result, { allowed: true, reason: 'ALLOWED' });
  assert.equal(seenKey, 'resolve-location');

  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    allowed: true,
    reason: 'ALLOWED',
  });
}

{
  const env = {
    API_RATE_LIMITER: {
      async limit() {
        return { success: false };
      },
    },
  };

  const result = await checkRateLimit(env);
  assert.deepEqual(result, { allowed: false, reason: 'RATE_LIMITED' });

  const response = await worker.fetch(request, env);
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), {
    allowed: false,
    reason: 'RATE_LIMITED',
  });
}

{
  const result = await checkRateLimit({});
  assert.deepEqual(result, {
    allowed: false,
    reason: 'RATE_LIMITER_BINDING_MISSING',
  });

  const response = await worker.fetch(request, {});
  assert.equal(response.status, 503);
}

{
  const response = await worker.fetch(
    new Request('https://rate-limiter.internal/resolve-location'),
    {
      API_RATE_LIMITER: {
        async limit() {
          throw new Error('GET should not call limiter');
        },
      },
    }
  );
  assert.equal(response.status, 405);
}

console.log('rate limiter worker tests: OK');
