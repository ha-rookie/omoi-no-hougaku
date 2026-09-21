const COORDINATE_PATTERN = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/;
const MAX_MAPS_URL_LENGTH = 2048;
const MAX_SHARED_TEXT_LENGTH = 4096;

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

export function parseCoordinateTitle(rawTitle) {
  const title = typeof rawTitle === 'string' ? rawTitle : '';
  const match = title.match(COORDINATE_PATTERN);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!isValidCoordinates(latitude, longitude)) return null;

  return { latitude, longitude };
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
  const coordinate = parseCoordinateTitle(payload.title);
  if (coordinate) {
    return {
      kind: 'coordinate',
      sourceType: 'shared-title-coordinate',
      ...coordinate,
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
  };
}
