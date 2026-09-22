import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('quiet mode overlay is outside the direction card', () => {
  const directionStart = html.indexOf('id="direction-panel"');
  const directionEnd = html.indexOf('</section>', directionStart);
  const quiet = html.indexOf('id="quiet-panel"');
  const add = html.indexOf('id="add-heading"');

  assert.ok(directionStart >= 0);
  assert.ok(directionEnd > directionStart);
  assert.ok(quiet > directionEnd);
  assert.ok(add > quiet);
  assert.equal((html.match(/id="quiet-panel"/g) ?? []).length, 1);
});
