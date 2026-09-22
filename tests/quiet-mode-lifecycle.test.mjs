import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('pagehide clears quiet mode before the PWA leaves the foreground', () => {
  assert.match(
    appSource,
    /addEventListener\('pagehide',[\s\S]*?stopDirectionRuntime\(\);[\s\S]*?view\.resetQuietMode\(\);/
  );
});

test('BFCache pageshow clears stale quiet mode and direction UI', () => {
  assert.match(
    appSource,
    /addEventListener\('pageshow',[\s\S]*?event\.persisted[\s\S]*?view\.resetQuietMode\(\);[\s\S]*?view\.hideDirection\(\);[\s\S]*?readShareFragment\(\);/
  );
});
