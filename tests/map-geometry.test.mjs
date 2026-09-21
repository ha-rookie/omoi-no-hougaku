import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  greatCirclePoints,
  pointInFeatureCollection,
  selectMapMode,
  splitAntimeridian,
} from '../public/js/core/map-geometry.js';

const japan = JSON.parse(
  await readFile(
    new URL('../public/data/maps/japan-prefectures.geojson', import.meta.url),
    'utf8'
  )
);

assert.equal(japan.type, 'FeatureCollection');
assert.equal(japan.features.length, 47);

const nagoya = { latitude: 35.170915, longitude: 136.881537 };
const tokyo = { latitude: 35.681236, longitude: 139.767125 };
const naha = { latitude: 26.2124, longitude: 127.6809 };
const seoul = { latitude: 37.5665, longitude: 126.9780 };
const honolulu = { latitude: 21.3069, longitude: -157.8583 };

assert.equal(pointInFeatureCollection(nagoya, japan), true);
assert.equal(pointInFeatureCollection(tokyo, japan), true);
assert.equal(pointInFeatureCollection(naha, japan), true);
assert.equal(pointInFeatureCollection(seoul, japan), false);
assert.equal(pointInFeatureCollection(honolulu, japan), false);

assert.equal(selectMapMode(nagoya, tokyo, japan), 'japan');
assert.equal(selectMapMode(nagoya, naha, japan), 'japan');
assert.equal(selectMapMode(nagoya, honolulu, japan), 'world');
assert.equal(selectMapMode(seoul, tokyo, japan), 'world');

{
  const points = greatCirclePoints(tokyo, honolulu, 64);
  assert.equal(points.length, 65);
  assert.ok(Math.abs(points[0].latitude - tokyo.latitude) < 1e-6);
  assert.ok(Math.abs(points[0].longitude - tokyo.longitude) < 1e-6);
  assert.ok(Math.abs(points.at(-1).latitude - honolulu.latitude) < 1e-6);
  assert.ok(Math.abs(points.at(-1).longitude - honolulu.longitude) < 1e-6);

  const segments = splitAntimeridian(points);
  assert.ok(segments.length >= 2, 'Tokyo→Honolulu should split at antimeridian');

  for (const segment of segments) {
    for (let index = 1; index < segment.length; index += 1) {
      const delta = Math.abs(
        segment[index].longitude - segment[index - 1].longitude
      );
      assert.ok(delta <= 180, `unexpected longitude jump: ${delta}`);
    }
  }
}

{
  const points = greatCirclePoints(nagoya, tokyo, 16);
  const segments = splitAntimeridian(points);
  assert.equal(segments.length, 1);
}

assert.throws(
  () =>
    selectMapMode(
      { latitude: 999, longitude: 136 },
      tokyo,
      japan
    ),
  TypeError
);

console.log('map geometry tests: OK');
