import assert from 'node:assert/strict';
import test from 'node:test';

import { isPreviewFixtureMode } from '../public/js/infrastructure/preview-fixture-mode.js';

test('preview fixture requires explicit query', () => {
  assert.equal(isPreviewFixtureMode({ search: '', hostname: 'abc123.omoi-no-hougaku.pages.dev' }), false);
});

test('preview fixture is enabled on Cloudflare Preview host', () => {
  assert.equal(isPreviewFixtureMode({ search: '?preview_fixture=1', hostname: 'abc123.omoi-no-hougaku.pages.dev' }), true);
});

test('preview fixture is disabled on canonical production', () => {
  assert.equal(isPreviewFixtureMode({ search: '?preview_fixture=1', hostname: 'omoi-no-hougaku.pages.dev' }), false);
});

test('internal_test alone never enables fixture UI', () => {
  assert.equal(isPreviewFixtureMode({ search: '?internal_test=1', hostname: 'abc123.omoi-no-hougaku.pages.dev' }), false);
});

test('localhost can use fixture mode for development', () => {
  assert.equal(isPreviewFixtureMode({ search: '?preview_fixture=1', hostname: 'localhost' }), true);
});
