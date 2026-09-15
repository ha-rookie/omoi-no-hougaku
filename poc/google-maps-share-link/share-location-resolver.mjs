const COORDINATE_PATTERN = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/;
const SUPPORTED_MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'www.google.com',
  'google.com',
  'maps.google.com',
]);

export function parseCoordinateTitle(rawTitle) {
  const title = typeof rawTitle === 'string' ? rawTitle : '';
  const match = title.match(COORDINATE_PATTERN);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function normalizeCandidateUrl(rawValue) {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !SUPPORTED_MAPS_HOSTS.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractGoogleMapsUrl(payload = {}) {
  const direct = normalizeCandidateUrl(payload.url);
  if (direct) return direct;

  const text = typeof payload.text === 'string' ? payload.text : '';
  const matches = text.match(/https:\/\/[^\s]+/g) ?? [];
  for (const match of matches) {
    const normalized = normalizeCandidateUrl(match.replace(/[),.;]+$/u, ''));
    if (normalized) return normalized;
  }

  return null;
}

export function classifySharedLocation(payload = {}) {
  const coordinate = parseCoordinateTitle(payload.title);
  if (coordinate) {
    return {
      kind: 'coordinate',
      source: 'shared-title',
      ...coordinate,
    };
  }

  const mapsUrl = extractGoogleMapsUrl(payload);
  if (mapsUrl) {
    return {
      kind: 'maps-url',
      source: 'shared-url',
      mapsUrl,
    };
  }

  return {
    kind: 'unsupported',
    source: 'shared-payload',
  };
}
