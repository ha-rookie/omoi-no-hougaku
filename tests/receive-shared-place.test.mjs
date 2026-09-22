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
    {
      title: '施設',
      text: '施設 https://maps.app.goo.gl/AbCdEf123',
    },
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

{
  let resolverCalled = false;
  await assert.rejects(
    () =>
      receiveSharedPlace(
        {
          title: '指定した地点',
          text: 'https://maps.app.goo.gl/AbCdEf123',
        },
        {
          resolveMapsUrl: async () => {
            resolverCalled = true;
            return { latitude: 35, longitude: 139 };
          },
        }
      ),
    (error) => {
      assert.ok(error instanceof SharedPlaceError);
      assert.equal(error.code, 'unconfirmed-pin-title');
      return true;
    }
  );
  assert.equal(resolverCalled, false);
}

{
  let resolverCalled = false;
  await assert.rejects(
    () =>
      receiveSharedPlace(
        {
          title: '91, 139',
          text: 'https://maps.app.goo.gl/AbCdEf123',
        },
        {
          resolveMapsUrl: async () => {
            resolverCalled = true;
            return { latitude: 35, longitude: 139 };
          },
        }
      ),
    (error) => {
      assert.ok(error instanceof SharedPlaceError);
      assert.equal(error.code, 'invalid-coordinate-title');
      return true;
    }
  );
  assert.equal(resolverCalled, false);
}

await assert.rejects(
  () =>
    receiveSharedPlace(
      {
        title: '施設',
        text: '施設 https://maps.app.goo.gl/AbCdEf123',
      },
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
    assert.equal(error.code, 'maps-url-not-found');
    return true;
  }
);

console.log('receive shared place tests: OK');
