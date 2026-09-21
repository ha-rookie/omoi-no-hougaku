import { normalizeDegrees } from './heading-normalizer.js';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_METERS = 6371008.8;

function validateCoordinate(latitude, longitude, label) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError(`${label}の緯度・経度は数値で指定してください。`);
  }
  if (latitude < -90 || latitude > 90) {
    throw new RangeError(`${label}の緯度は -90〜90 の範囲で指定してください。`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new RangeError(`${label}の経度は -180〜180 の範囲で指定してください。`);
  }
}

export function initialBearingDegrees(from, to) {
  validateCoordinate(from.latitude, from.longitude, '現在地');
  validateCoordinate(to.latitude, to.longitude, '目的地');

  const phi1 = from.latitude * DEG_TO_RAD;
  const phi2 = to.latitude * DEG_TO_RAD;
  const deltaLambda = (to.longitude - from.longitude) * DEG_TO_RAD;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2)
    - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  if (Math.abs(x) < Number.EPSILON && Math.abs(y) < Number.EPSILON) {
    return null;
  }

  return normalizeDegrees(Math.atan2(y, x) * RAD_TO_DEG);
}

export function greatCircleDistanceMeters(from, to) {
  validateCoordinate(from.latitude, from.longitude, '現在地');
  validateCoordinate(to.latitude, to.longitude, '目的地');

  const phi1 = from.latitude * DEG_TO_RAD;
  const phi2 = to.latitude * DEG_TO_RAD;
  const deltaPhi = (to.latitude - from.latitude) * DEG_TO_RAD;
  const deltaLambda = (to.longitude - from.longitude) * DEG_TO_RAD;

  const sinHalfPhi = Math.sin(deltaPhi / 2);
  const sinHalfLambda = Math.sin(deltaLambda / 2);
  const a = sinHalfPhi ** 2
    + Math.cos(phi1) * Math.cos(phi2) * sinHalfLambda ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return EARTH_RADIUS_METERS * c;
}
