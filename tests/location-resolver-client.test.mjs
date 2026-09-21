import assert from 'node:assert/strict';
import {
  LocationResolverClientError,
  resolveLocationFromMapsUrl,
} from '../public/js/infrastructure/location-resolver-client.js';

{
  let request = null;
  const result = await resolveLocationFromMapsUrl(
    'https://maps.app.goo.gl/AbCdEf123',
    {
      fetchImpl: async (url, init) => {
        request = { url, init };
        return new Response(
          JSON.stringify({
            ok: true,
            latitude: 35.681236,
            longitude: 139.767125,
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      },
    }
  );

  assert.equal(request.url, '/api/resolve-location');
  assert.equal(request.init.method, 'POST');
  assert.deepEqual(JSON.parse(request.init.body), {
    url: 'https://maps.app.goo.gl/AbCdEf123',
  });
  assert.deepEqual(result, {
    latitude: 35.681236,
    longitude: 139.767125,
  });
}

await assert.rejects(
  () =>
    resolveLocationFromMapsUrl('https://maps.app.goo.gl/AbCdEf123', {
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: 'RATE_LIMITED',
              message: '少し時間を置いてください',
            },
          }),
          {
            status: 429,
            headers: { 'content-type': 'application/json' },
          }
        ),
    }),
  (error) => {
    assert.ok(error instanceof LocationResolverClientError);
    assert.equal(error.code, 'RATE_LIMITED');
    assert.equal(error.status, 429);
    return true;
  }
);

await assert.rejects(
  () =>
    resolveLocationFromMapsUrl('https://maps.app.goo.gl/AbCdEf123', {
      fetchImpl: async () => {
        throw new Error('offline');
      },
    }),
  (error) => {
    assert.ok(error instanceof LocationResolverClientError);
    assert.equal(error.code, 'NETWORK_ERROR');
    return true;
  }
);

console.log('location resolver client tests: OK');
