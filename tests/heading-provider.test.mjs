import test from 'node:test';
import assert from 'node:assert/strict';

import { selectHeadingForGuidance } from '../../public/js/infrastructure/heading-provider.js';

test('absolute alpha remains the guidance heading even when another tilted-device diagnostic differs', () => {
  const selected = selectHeadingForGuidance({
    webkitHeading: null,
    absolute: true,
    alphaHeading: 2.5,
    w3cFacingHeading: 220,
    posture: '傾きあり',
  });

  assert.deepEqual(selected, {
    heading: 2.5,
    source: 'absolute-alpha',
  });
});

test('webkit compass heading remains highest priority when present', () => {
  const selected = selectHeadingForGuidance({
    webkitHeading: 357.2,
    absolute: true,
    alphaHeading: 12,
  });

  assert.deepEqual(selected, {
    heading: 357.2,
    source: 'webkitCompassHeading',
  });
});

test('relative-only orientation does not become a trusted heading', () => {
  const selected = selectHeadingForGuidance({
    webkitHeading: null,
    absolute: false,
    alphaHeading: null,
  });

  assert.deepEqual(selected, {
    heading: null,
    source: 'relative-orientation-only',
  });
});
