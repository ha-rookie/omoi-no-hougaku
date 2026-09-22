import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('internal test UI ships hidden and exposes Honolulu fixture', () => {
  assert.match(html, /id="internal-test-panel"[\s\S]*?hidden/);
  assert.match(html, /data-test-place="honolulu"/);
  assert.match(app, /if \(!internalTestMode\) return;/);
  assert.match(app, /name: 'ホノルル'/);
  assert.match(app, /latitude: 21\.3069/);
  assert.match(app, /longitude: -157\.8583/);
  assert.match(app, /repository\.save\(place\)/);
});
