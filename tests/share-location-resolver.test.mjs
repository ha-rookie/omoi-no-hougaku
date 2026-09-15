import assert from 'node:assert/strict';
import {
  classifySharedLocation,
  extractGoogleMapsUrl,
  parseCoordinateTitle,
} from '../poc/google-maps-share-link/share-location-resolver.mjs';

assert.deepEqual(parseCoordinateTitle('34.950599,136.767197'), {
  latitude: 34.950599,
  longitude: 136.767197,
});
assert.deepEqual(parseCoordinateTitle(' -90 , 180 '), {
  latitude: -90,
  longitude: 180,
});
assert.equal(parseCoordinateTitle('91,136'), null);
assert.equal(parseCoordinateTitle('34.95,181'), null);
assert.equal(parseCoordinateTitle('指定した地点'), null);
assert.equal(parseCoordinateTitle('34.95,136.7 extra'), null);

assert.equal(
  extractGoogleMapsUrl({ text: 'https://maps.app.goo.gl/D9b8NjBYiHjHxuRdA' }),
  'https://maps.app.goo.gl/D9b8NjBYiHjHxuRdA'
);
assert.equal(
  extractGoogleMapsUrl({ url: 'https://maps.app.goo.gl/abc?g_st=ac' }),
  'https://maps.app.goo.gl/abc?g_st=ac'
);
assert.equal(extractGoogleMapsUrl({ text: 'https://example.com/not-maps' }), null);
assert.equal(extractGoogleMapsUrl({ text: 'http://maps.app.goo.gl/insecure' }), null);

assert.deepEqual(
  classifySharedLocation({
    title: '34.950599,136.767197',
    text: 'https://maps.app.goo.gl/D9b8NjBYiHjHxuRdA',
  }),
  {
    kind: 'coordinate',
    source: 'shared-title',
    latitude: 34.950599,
    longitude: 136.767197,
  }
);

assert.deepEqual(
  classifySharedLocation({
    title: '荒子観音',
    text: 'https://maps.app.goo.gl/example',
  }),
  {
    kind: 'maps-url',
    source: 'shared-url',
    mapsUrl: 'https://maps.app.goo.gl/example',
  }
);

assert.deepEqual(classifySharedLocation({ title: '指定した地点', text: '' }), {
  kind: 'unsupported',
  source: 'shared-payload',
});

console.log('share location resolver tests: OK');
