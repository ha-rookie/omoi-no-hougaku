import assert from 'node:assert/strict';
import {
  MapResolveError,
  resolveShortGoogleMapsUrl,
} from '../functions/_shared/google-maps-resolver.js';

function response(status, location) {
  return new Response(null, {
    status,
    headers: location ? { location } : {},
  });
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof MapResolveError);
    assert.equal(error.code, code);
    return true;
  });
}

{
  const fetchImpl = async (url) => {
    assert.equal(url, 'https://maps.app.goo.gl/abc123');
    return response(
      302,
      'https://www.google.com/maps/place/Test/data=!3d55.9475937!4d-3.1612761'
    );
  };

  const result = await resolveShortGoogleMapsUrl(
    'https://maps.app.goo.gl/abc123',
    fetchImpl
  );

  assert.deepEqual(result, {
    latitude: 55.9475937,
    longitude: -3.1612761,
    sourceType: 'google-maps-place-data',
  });
}

{
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    if (seen.length === 1) {
      return response(302, 'https://maps.google.com/?q=Test');
    }
    if (seen.length === 2) {
      assert.equal(url, 'https://maps.google.com/?q=Test');
      return response(
        302,
        'https://www.google.com/maps/place/Test/data=!3d35.681236!4d139.767125'
      );
    }
    throw new Error('unexpected fetch');
  };

  const result = await resolveShortGoogleMapsUrl(
    'https://maps.app.goo.gl/abc123',
    fetchImpl
  );

  assert.deepEqual(result, {
    latitude: 35.681236,
    longitude: 139.767125,
    sourceType: 'google-maps-place-data',
  });
  assert.equal(seen.length, 2);
}

{
  const fetchImpl = async () => response(302, 'https://evil.example/maps/place/Test');
  await expectCode(
    resolveShortGoogleMapsUrl('https://maps.app.goo.gl/abc123', fetchImpl),
    'REDIRECT_HOST_NOT_ALLOWED'
  );
}

{
  const fetchImpl = async () => response(302, 'https://www.google.com/maps/@35.0,139.0,10z');
  await expectCode(
    resolveShortGoogleMapsUrl('https://maps.app.goo.gl/abc123', fetchImpl),
    'VIEWPORT_ONLY'
  );
}

{
  let count = 0;
  const fetchImpl = async () => {
    count += 1;
    return response(302, `https://maps.app.goo.gl/loop${count}`);
  };
  await expectCode(
    resolveShortGoogleMapsUrl('https://maps.app.goo.gl/start', fetchImpl),
    'TOO_MANY_REDIRECTS'
  );
}

{
  await expectCode(
    resolveShortGoogleMapsUrl('https://example.com/maps', async () => response(200)),
    'REDIRECT_HOST_NOT_ALLOWED'
  );
}

console.log('server resolver tests: OK');
