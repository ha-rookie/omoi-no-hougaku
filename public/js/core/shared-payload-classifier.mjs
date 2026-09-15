import {
  looksLikeCoordinateTitle,
  parseCoordinateTitle,
} from './coordinate-validator.mjs';

const MAX_TITLE_LENGTH = 512;
const MAX_TEXT_LENGTH = 4096;
const GENERIC_PIN_TITLES = new Set([
  '指定した地点',
  'dropped pin',
]);

function normalizeField(value, maxLength) {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  if (value.length > maxLength) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeSupportedMapsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'maps.app.goo.gl') return null;
    if (!url.pathname || url.pathname === '/') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractGoogleMapsUrl(payload) {
  const direct = normalizeSupportedMapsUrl(normalizeField(payload?.url, MAX_TEXT_LENGTH));
  if (direct) return direct;

  const text = normalizeField(payload?.text, MAX_TEXT_LENGTH);
  if (!text) return null;

  const matches = text.match(/https:\/\/maps\.app\.goo\.gl\/[^\s<>'\"]+/g) ?? [];
  for (const match of matches) {
    const normalized = normalizeSupportedMapsUrl(match);
    if (normalized) return normalized;
  }
  return null;
}

export function classifySharedPayload(payload) {
  const title = normalizeField(payload?.title, MAX_TITLE_LENGTH);
  const coordinate = parseCoordinateTitle(title);

  if (coordinate) {
    return {
      kind: 'coordinate',
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      suggestedName: '',
      sourceType: 'shared-title-coordinate',
    };
  }

  if (looksLikeCoordinateTitle(title)) {
    return { kind: 'unsupported', reason: 'invalid-coordinate-title' };
  }

  if (!title || GENERIC_PIN_TITLES.has(title.toLowerCase())) {
    return { kind: 'unsupported', reason: 'unconfirmed-pin-title' };
  }

  const mapsUrl = extractGoogleMapsUrl(payload);
  if (!mapsUrl) {
    return { kind: 'unsupported', reason: 'maps-url-not-found' };
  }

  return {
    kind: 'maps-url',
    mapsUrl,
    suggestedName: title,
    sourceType: 'maps-url-api',
  };
}
