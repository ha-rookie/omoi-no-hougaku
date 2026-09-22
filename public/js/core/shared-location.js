const COORDINATE_PATTERN = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/;
const COORDINATE_LIKE_PATTERN = /^\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*,/;
const MAX_TITLE_LENGTH = 512;
const MAX_MAPS_URL_LENGTH = 2048;
const MAX_SHARED_TEXT_LENGTH = 4096;
const GENERIC_PIN_TITLES = new Set([
  '指定した地点',
  'dropped pin',
]);

export function isValidCoordinates(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeTitle(rawTitle) {
  if (typeof rawTitle !== 'string') return '';
  if (rawTitle.length > MAX_TITLE_LENGTH) return '';
  return rawTitle.trim();
}

export function parseCoordinateTitle(rawTitle) {
  const title = normalizeTitle(rawTitle);
  if (!title) return null;

  const match = title.match(COORDINATE_PATTERN);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!isValidCoordinates(latitude, longitude)) return null;

  return { latitude, longitude };
}

export function looksLikeCoordinateTitle(rawTitle) {
  const title = normalizeTitle(rawTitle);
  return Boolean(title && COORDINATE_LIKE_PATTERN.test(title));
}

function normalizeMapsShortUrl(rawValue) {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value || value.length > MAX_MAPS_URL_LENGTH) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (url.hostname !== 'maps.app.goo.gl') return null;
    if (!url.pathname || url.pathname === '/') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractGoogleMapsUrl(payload = {}) {
  const direct = normalizeMapsShortUrl(payload.url);
  if (direct) return direct;

  const text = typeof payload.text === 'string' ? payload.text : '';
  if (!text || text.length > MAX_SHARED_TEXT_LENGTH) return null;

  const matches = text.match(/https:\/\/[^\s]+/g) ?? [];
  for (const match of matches) {
    const normalized = normalizeMapsShortUrl(match.replace(/[),.;]+$/u, ''));
    if (normalized) return normalized;
  }

  return null;
}

export function classifySharedLocation(payload = {}) {
  const title = normalizeTitle(payload.title);
  const coordinate = parseCoordinateTitle(title);

  if (coordinate) {
    return {
      kind: 'coordinate',
      sourceType: 'shared-title-coordinate',
      ...coordinate,
    };
  }

  // ADR-0004: a pin whose title looks like coordinates but is invalid must
  // never fall back to Place ID resolution, because that can resolve a
  // nearby named place instead of the original pin.
  if (looksLikeCoordinateTitle(title)) {
    return {
      kind: 'unsupported',
      sourceType: 'unsupported',
      reason: 'invalid-coordinate-title',
    };
  }

  // ADR-0004: generic/unnamed pins must not use the Maps URL API fallback.
  // Only a named facility is allowed to enter the Place ID resolution path.
  if (!title || GENERIC_PIN_TITLES.has(title.toLowerCase())) {
    return {
      kind: 'unsupported',
      sourceType: 'unsupported',
      reason: 'unconfirmed-pin-title',
    };
  }

  const mapsUrl = extractGoogleMapsUrl(payload);
  if (mapsUrl) {
    return {
      kind: 'maps-url',
      sourceType: 'maps-url-api',
      mapsUrl,
    };
  }

  return {
    kind: 'unsupported',
    sourceType: 'unsupported',
    reason: 'maps-url-not-found',
  };
}
