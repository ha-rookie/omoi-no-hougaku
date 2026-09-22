import assert from 'node:assert/strict';
import { shouldEnterAlignedState } from '../public/js/app/alignment-transition.js';

assert.equal(
  shouldEnterAlignedState({
    session: { alignment: { aligned: true } },
    viewMode: 'compass',
    alreadyAligned: false,
  }),
  true
);

assert.equal(
  shouldEnterAlignedState({
    session: { alignment: { aligned: true } },
    viewMode: 'map',
    alreadyAligned: false,
  }),
  false
);

assert.equal(
  shouldEnterAlignedState({
    session: { alignment: { aligned: true } },
    viewMode: 'compass',
    alreadyAligned: true,
  }),
  false
);

assert.equal(
  shouldEnterAlignedState({
    session: { alignment: { aligned: false } },
    viewMode: 'compass',
    alreadyAligned: false,
  }),
  false
);

console.log('alignment transition tests: OK');
