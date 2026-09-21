import assert from 'node:assert/strict';
import {
  greatCircleDistanceMeters,
  initialBearingDegrees,
} from '../public/js/core/bearing-engine.js';
import {
  cardinalDirection,
  headingFromAbsoluteAlpha,
  magneticToTrueHeading,
  normalizeDegrees,
  shortestAngleDifference,
} from '../public/js/core/heading-normalizer.js';
import { evaluateAlignment } from '../public/js/core/alignment-engine.js';

const nagoya = { latitude: 35.170915, longitude: 136.881537 };
const tokyo = { latitude: 35.681236, longitude: 139.767125 };

const bearing = initialBearingDegrees(nagoya, tokyo);
assert.ok(bearing > 65 && bearing < 75, `unexpected Nagoya→Tokyo bearing: ${bearing}`);

const distance = greatCircleDistanceMeters(nagoya, tokyo);
assert.ok(distance > 250000 && distance < 280000, `unexpected Nagoya→Tokyo distance: ${distance}`);

assert.equal(normalizeDegrees(360), 0);
assert.equal(normalizeDegrees(-10), 350);
assert.equal(headingFromAbsoluteAlpha(10), 350);
assert.equal(magneticToTrueHeading(355, 5), 0);

assert.equal(cardinalDirection(0), '北');
assert.equal(cardinalDirection(90), '東');
assert.equal(cardinalDirection(180), '南');
assert.equal(cardinalDirection(270), '西');

assert.equal(shortestAngleDifference(350, 10), 20);
assert.equal(shortestAngleDifference(10, 350), -20);

assert.deepEqual(evaluateAlignment(358, 0, 5), {
  delta: 2,
  aligned: true,
  direction: 'aligned',
  message: 'こちらの方角です。',
});

assert.deepEqual(evaluateAlignment(330, 0, 5), {
  delta: 30,
  aligned: false,
  direction: 'right',
  message: '右へ約30°',
});

assert.deepEqual(evaluateAlignment(30, 0, 5), {
  delta: -30,
  aligned: false,
  direction: 'left',
  message: '左へ約30°',
});

console.log('direction core tests: OK');
