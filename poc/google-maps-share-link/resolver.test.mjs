import assert from 'node:assert/strict';
import {
  PlaceInputError,
  extractCoordinatesFromGoogleMapsUrl,
  parseCoordinateText,
  resolveGoogleMapsInput,
} from './resolver.mjs';

function expectError(fn, code) {
  try {
    fn();
    assert.fail(`Expected ${code}`);
  } catch (error) {
    assert.ok(error instanceof PlaceInputError);
    assert.equal(error.code, code);
  }
}

assert.deepEqual(parseCoordinateText('35.681236, 139.767125'), {
  latitude: 35.681236,
  longitude: 139.767125,
});

assert.deepEqual(
  extractCoordinatesFromGoogleMapsUrl(
    'https://www.google.com/maps/place/Test/@35.0,139.0,16z/data=!4m6!3d35.681236!4d139.767125'
  ),
  {
    latitude: 35.681236,
    longitude: 139.767125,
    sourceType: 'google-maps-place-data',
    resolvedUrl:
      'https://www.google.com/maps/place/Test/@35.0,139.0,16z/data=!4m6!3d35.681236!4d139.767125',
  }
);

const query = extractCoordinatesFromGoogleMapsUrl(
  'https://www.google.com/maps/search/?api=1&query=55.9533%2C-3.1883'
);
assert.equal(query.latitude, 55.9533);
assert.equal(query.longitude, -3.1883);
assert.equal(query.sourceType, 'google-maps-query');

expectError(
  () =>
    extractCoordinatesFromGoogleMapsUrl(
      'https://www.google.com/maps/@55.9533,-3.1883,14z'
    ),
  'VIEWPORT_ONLY'
);

expectError(
  () =>
    extractCoordinatesFromGoogleMapsUrl(
      'https://example.com/maps?q=35,139'
    ),
  'UNSUPPORTED_URL'
);

expectError(
  () =>
    extractCoordinatesFromGoogleMapsUrl(
      'https://maps.app.goo.gl.evil.example/test'
    ),
  'UNSUPPORTED_URL'
);

expectError(() => parseCoordinateText('95,139'), 'INVALID_COORDINATES');

const shortResolved = await resolveGoogleMapsInput(
  'https://maps.app.goo.gl/abc123',
  {
    fetchImpl: async () => ({
      url: 'https://www.google.com/maps/place/Test/data=!4m6!3d55.9533!4d-3.1883',
    }),
  }
);
assert.equal(shortResolved.latitude, 55.9533);
assert.equal(shortResolved.longitude, -3.1883);

await assert.rejects(
  () =>
    resolveGoogleMapsInput('https://maps.app.goo.gl/abc123', {
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    }),
  (error) =>
    error instanceof PlaceInputError &&
    error.code === 'SHORT_URL_BROWSER_BLOCKED'
);

console.log('resolver tests: OK');
