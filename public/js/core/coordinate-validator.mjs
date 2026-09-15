export function isValidCoordinate(latitude, longitude) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export function parseCoordinateTitle(value) {
  if (typeof value !== 'string' || value.length > 128) return null;

  const match = value.match(/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!isValidCoordinate(latitude, longitude)) return null;
  return { latitude, longitude };
}

export function looksLikeCoordinateTitle(value) {
  return typeof value === 'string'
    && /^\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*,/.test(value);
}
