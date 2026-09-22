import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  isIosDevice,
  isStandaloneMode,
} from '../public/js/infrastructure/pwa-install.js';

const manifest = JSON.parse(
  fs.readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')
);
const iconSizes = new Set(manifest.icons?.map((icon) => icon.sizes));

assert.equal(manifest.id, '/');
assert.equal(manifest.lang, 'ja-JP');
assert.equal(manifest.display, 'standalone');
assert.equal(iconSizes.has('192x192'), true);
assert.equal(iconSizes.has('512x512'), true);
assert.equal(
  manifest.icons.some(
    (icon) =>
      icon.src === '/assets/app-icon.svg' &&
      icon.sizes === '192x192' &&
      icon.type === 'image/svg+xml'
  ),
  true
);
assert.equal(
  manifest.icons.some(
    (icon) =>
      icon.src === '/assets/app-icon.svg' &&
      icon.sizes === '512x512' &&
      icon.type === 'image/svg+xml'
  ),
  true
);

assert.equal(
  isStandaloneMode(
    { matchMedia: () => ({ matches: true }) },
    { standalone: false }
  ),
  true
);
assert.equal(
  isStandaloneMode(
    { matchMedia: () => ({ matches: false }) },
    { standalone: true }
  ),
  true
);
assert.equal(
  isStandaloneMode(
    { matchMedia: () => ({ matches: false }) },
    { standalone: false }
  ),
  false
);

assert.equal(
  isIosDevice({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    platform: 'iPhone',
    maxTouchPoints: 5,
  }),
  true
);
assert.equal(
  isIosDevice({
    userAgent: 'Mozilla/5.0 (Linux; Android 16)',
    platform: 'Linux armv8l',
    maxTouchPoints: 5,
  }),
  false
);

const pwaSource = fs.readFileSync(
  new URL('../public/js/infrastructure/pwa-install.js', import.meta.url),
  'utf8'
);
const html = fs.readFileSync(
  new URL('../public/index.html', import.meta.url),
  'utf8'
);

assert.match(pwaSource, /beforeinstallprompt/);
assert.match(pwaSource, /appinstalled/);
assert.match(pwaSource, /deferredInstallPrompt\.prompt\(\)/);
assert.match(html, /id="pwa-install-panel"/);
assert.match(html, /id="pwa-install-button"/);
assert.match(html, /Google Mapsから共有するには/);

console.log('pwa install tests passed');
