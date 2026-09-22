import assert from 'node:assert/strict';
import {
  classifySharedLocation,
  extractGoogleMapsUrl,
  parseCoordinateTitle,
} from '../public/js/core/shared-location.js';

assert.deepEqual(parseCoordinateTitle('35.681236, 139.767125'), {
  latitude: 35.681236,
  longitude: 139.767125,
});

assert.equal(parseCoordinateTitle('91, 139'), null);
assert.equal(parseCoordinateTitle('35, 181'), null);
assert.equal(parseCoordinateTitle('Tokyo Station'), null);

assert.equal(
  extractGoogleMapsUrl({
    text: '東京駅 https://maps.app.goo.gl/AbCdEf123',
  }),
  'https://maps.app.goo.gl/AbCdEf123'
);

assert.equal(
  extractGoogleMapsUrl({
    url: 'https://www.google.com/maps/place/Tokyo',
  }),
  null
);

assert.deepEqual(
  classifySharedLocation({ title: '34.0,135.0' }),
  {
    kind: 'coordinate',
    sourceType: 'shared-title-coordinate',
    latitude: 34,
    longitude: 135,
  }
);

assert.deepEqual(
  classifySharedLocation({
    title: '施設名',
    text: 'https://maps.app.goo.gl/AbCdEf123',
  }),
  {
    kind: 'maps-url',
    sourceType: 'maps-url-api',
    mapsUrl: 'https://maps.app.goo.gl/AbCdEf123',
    suggestedName: '施設名',
  }
);

assert.deepEqual(
  classifySharedLocation({
    title: '指定した地点',
    text: 'https://maps.app.goo.gl/AbCdEf123',
  }),
  {
    kind: 'unsupported',
    sourceType: 'unsupported',
    reason: 'unconfirmed-pin-title',
  }
);

assert.deepEqual(
  classifySharedLocation({
    title: '91, 139',
    text: 'https://maps.app.goo.gl/AbCdEf123',
  }),
  {
    kind: 'unsupported',
    sourceType: 'unsupported',
    reason: 'invalid-coordinate-title',
  }
);

assert.deepEqual(classifySharedLocation({ text: '場所だけ' }), {
  kind: 'unsupported',
  sourceType: 'unsupported',
  reason: 'unconfirmed-pin-title',
});

console.log('shared location tests: OK');
