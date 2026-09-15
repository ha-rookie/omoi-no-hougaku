import assert from 'node:assert/strict';
import {
  MapsGroundingError,
  normalizeSupportedMapsUrl,
  resolveMapsUrlsWithGoogle,
} from '../functions/_shared/maps-grounding-resolver.js';

function assertThrowsCode(fn, code) {
  assert.throws(fn, (error) => error instanceof MapsGroundingError && error.code === code);
}

assert.equal(
  normalizeSupportedMapsUrl('https://maps.app.goo.gl/P9GumPt6WVXFuTtq9'),
  'https://maps.app.goo.gl/P9GumPt6WVXFuTtq9'
);
assertThrowsCode(() => normalizeSupportedMapsUrl('http://maps.app.goo.gl/abc'), 'HTTPS_REQUIRED');
assertThrowsCode(() => normalizeSupportedMapsUrl('https://example.com/abc'), 'UNSUPPORTED_HOST');
assertThrowsCode(() => normalizeSupportedMapsUrl('https://maps.app.goo.gl/'), 'INVALID_MAPS_URL');

let capturedRequest = null;
const fakeFetch = async (url, init) => {
  capturedRequest = { url, init };
  return new Response(
    JSON.stringify({
      entities: [{ place: 'places/ChIJ_TEST_PLACE' }],
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  );
};

const result = await resolveMapsUrlsWithGoogle(
  ['https://maps.app.goo.gl/P9GumPt6WVXFuTtq9'],
  { apiKey: 'test-key', fetchImpl: fakeFetch }
);

assert.equal(capturedRequest.url, 'https://mapstools.googleapis.com/v1alpha:resolveMapsUrls');
assert.equal(capturedRequest.init.method, 'POST');
assert.equal(capturedRequest.init.headers['x-goog-api-key'], 'test-key');
assert.deepEqual(JSON.parse(capturedRequest.init.body), {
  urls: ['https://maps.app.goo.gl/P9GumPt6WVXFuTtq9'],
});
assert.equal(result.entities[0].place, 'places/ChIJ_TEST_PLACE');

const partialFailureFetch = async () =>
  new Response(
    JSON.stringify({
      entities: [{}],
      failedRequests: {
        0: { code: 3, message: 'Invalid URL.' },
      },
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  );

const partial = await resolveMapsUrlsWithGoogle(
  ['https://maps.app.goo.gl/P9GumPt6WVXFuTtq9'],
  { apiKey: 'test-key', fetchImpl: partialFailureFetch }
);
assert.deepEqual(partial.entities[0], {});
assert.equal(partial.failedRequests['0'].code, 3);

await assert.rejects(
  () =>
    resolveMapsUrlsWithGoogle(['https://maps.app.goo.gl/P9GumPt6WVXFuTtq9'], {
      apiKey: '',
      fetchImpl: fakeFetch,
    }),
  (error) => error instanceof MapsGroundingError && error.code === 'API_KEY_NOT_CONFIGURED'
);

console.log('maps grounding resolver tests: OK');
