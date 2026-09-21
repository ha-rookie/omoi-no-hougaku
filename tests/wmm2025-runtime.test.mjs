import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { computeWmm2025 } from '../../public/js/vendor/geomagnetism-wmm2025.js';

const model = JSON.parse(
  await readFile(new URL('../../public/data/wmm-2025.json', import.meta.url), 'utf8'),
);

const NOAA_REFERENCE = [
  { date: new Date('2025-01-01T00:00:00Z'), lat: 80, lon: 0, decl: 1.28 },
  { date: new Date('2025-01-01T00:00:00Z'), lat: 0, lon: 120, decl: -0.16 },
  { date: new Date('2025-01-01T00:00:00Z'), lat: -80, lon: -120, decl: 68.78 },
  { date: new Date('2027-07-02T12:00:00Z'), lat: 80, lon: 0, decl: 2.59 },
  { date: new Date('2027-07-02T12:00:00Z'), lat: 0, lon: 120, decl: -0.24 },
  { date: new Date('2027-07-02T12:00:00Z'), lat: -80, lon: -120, decl: 68.49 },
];

for (const reference of NOAA_REFERENCE) {
  test(`WMM2025 declination matches NOAA at ${reference.date.toISOString()} / ${reference.lat},${reference.lon}`, () => {
    const result = computeWmm2025(
      model,
      reference.lat,
      reference.lon,
      reference.date,
      0,
    );

    assert.ok(
      Math.abs(result.decl - reference.decl) <= 0.01,
      `expected ${reference.decl}°, got ${result.decl}°`,
    );
  });
}

test('WMM2025 fails closed outside its model interval', () => {
  assert.throws(
    () => computeWmm2025(model, 35, 136, new Date('2030-01-01T00:00:00Z')),
    (error) => error instanceof RangeError && error.code === 'out_of_model_range',
  );
});

test('WMM2025 rejects invalid coordinates', () => {
  assert.throws(
    () => computeWmm2025(model, 91, 136, new Date('2026-01-01T00:00:00Z')),
    RangeError,
  );
});
