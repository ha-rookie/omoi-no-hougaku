import assert from 'node:assert/strict';
import {
  SharedPlaceError,
  receiveSharedPlace,
} from '../public/js/app/receive-shared-place.js';

{
  let resolverCalled = false;
  const candidate = await receiveSharedPlace(
    { title: '35.0,139.0' },
    {
      resolveMapsUrl: async () => {
        resolverCalled = true;
        throw new Error('must not be called');
      },
    }
  );

  assert.equal(resolverCalled, false);
  assert.deepEqual(candidate, {
    latitude: 35,
    longitude: 139,
    sourceType: 'shared-title-coordinate',
  });
}

{
  let seenUrl = null;
  const candidate = await receiveSharedPlace(
    { text: '施設 https://maps.app.goo.gl/AbCdEf123' },
    {
      resolveMapsUrl: async (url) => {
        seenUrl = url;
        return { latitude: 35.681236, longitude: 139.767125 };
      },
    }
  );

  assert.equal(seenUrl, 'https://maps.app.goo.gl/AbCdEf123');
  assert.deepEqual(candidate, {
    latitude: 35.681236,
    longitude: 139.767125,
    sourceType: 'maps-url-api',
  });
}

await assert.rejects(
  () =>
    receiveSharedPlace(
      { text: '施設 https://maps.app.goo.gl/AbCdEf123' },
      {
        resolveMapsUrl: async () => ({ latitude: 999, longitude: 139 }),
      }
    ),
  (error) => {
    assert.ok(error instanceof SharedPlaceError);
    assert.equal(error.code, 'INVALID_RESOLVED_COORDINATES');
    return true;
  }
);

await assert.rejects(
  () =>
    receiveSharedPlace(
      { title: '施設名だけ' },
      { resolveMapsUrl: async () => ({}) }
    ),
  (error) => {
    assert.ok(error instanceof SharedPlaceError);
    assert.equal(error.code, 'UNSUPPORTED_SHARE');
    return true;
  }
);

console.log('receive shared place tests: OK');
