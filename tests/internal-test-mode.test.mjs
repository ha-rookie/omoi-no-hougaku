import assert from 'node:assert/strict';
import { isInternalTestMode } from '../public/js/infrastructure/internal-test-mode.js';

assert.equal(isInternalTestMode(''), false);
assert.equal(isInternalTestMode('?internal_test=1'), true);
assert.equal(isInternalTestMode('?internal_test=0'), false);
assert.equal(isInternalTestMode('?internal_test=10'), false);
assert.equal(isInternalTestMode('?internal_test='), false);
assert.equal(isInternalTestMode('?foo=1&internal_test=1&bar=2'), true);
assert.equal(isInternalTestMode('?internal_test=0&internal_test=1'), true);
assert.equal(isInternalTestMode('?internal_test=1&internal_test=0'), true);
assert.equal(isInternalTestMode('?foo=1'), false);

console.log('internal-test-mode tests passed');
