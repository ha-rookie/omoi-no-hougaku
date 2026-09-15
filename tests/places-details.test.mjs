import assert from 'node:assert/strict';
import {
  PlacesDetailsError,
  getPlaceLocation,
  normalizePlaceId,
} from '../functions/_shared/places-details.js';

assert.equal(normalizePlaceId('places/ChIJabc_123'), 'ChIJabc_123');
assert.equal(normalizePlaceId('GhIJRuP1BZlbQUARbywoDMoZYUA'), 'GhIJRuP1BZlbQUARbywoDMoZYUA');
assert.throws(() => normalizePlaceId(''), (error) => error?.code === 'PLACE_ID_REQUIRED');
assert.throws(() => normalizePlaceId('places/a/b'), (error) => error?.code === 'INVALID_PLACE_ID');

{
  let capturedUrl = null;
  let capturedHeaders = null;
  const result = await getPlaceLocation('places/GhIJRuP1BZlbQUARbywoDMoZYUA', {
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      capturedUrl = url;
      capturedHeaders = options.headers;
      return new Response(
        JSON.stringify({
          id: 'GhIJRuP1BZlbQUARbywoDMoZYUA',
          location: {
            latitude: 34.715607,
            longitude: 136.805914,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    },
  });

  const parsedUrl = new URL(capturedUrl);
  assert.equal(
    `${parsedUrl.origin}${parsedUrl.pathname}`,
    'https://places.googleapis.com/v1/places/GhIJRuP1BZlbQUARbywoDMoZYUA'
  );
  assert.equal(parsedUrl.searchParams.get('fields'), 'id,location');
  assert.equal(capturedHeaders['x-goog-api-key'], 'test-key');
  assert.equal(capturedHeaders['x-goog-field-mask'], undefined);
  assert.deepEqual(result, {
    placeId: 'GhIJRuP1BZlbQUARbywoDMoZYUA',
    latitude: 34.715607,
    longitude: 136.805914,
  });
}

{
  await assert.rejects(
    () =>
      getPlaceLocation('GhIJRuP1BZlbQUARbywoDMoZYUA', {
        apiKey: 'test-key',
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              error: {
                status: 'PERMISSION_DENIED',
                message: 'API key not allowed',
              },
            }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          ),
      }),
    (error) =>
      error instanceof PlacesDetailsError &&
      error.code === 'PLACES_API_ERROR' &&
      error.details?.httpStatus === 403
  );
}

{
  await assert.rejects(
    () =>
      getPlaceLocation('GhIJRuP1BZlbQUARbywoDMoZYUA', {
        apiKey: 'test-key',
        fetchImpl: async () =>
          new Response(JSON.stringify({ id: 'GhIJRuP1BZlbQUARbywoDMoZYUA' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      }),
    (error) => error instanceof PlacesDetailsError && error.code === 'LOCATION_NOT_RETURNED'
  );
}

console.log('places details tests: OK');
