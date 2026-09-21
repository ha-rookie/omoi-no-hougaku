const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function normalizeDegrees(value) {
  if (!Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
}

export function headingFromAbsoluteAlpha(alpha) {
  if (!Number.isFinite(alpha)) return null;
  return normalizeDegrees(360 - alpha);
}

/**
 * W3C Device Orientation specification example for the horizontal component
 * of the vector pointing out of the back of the screen.
 *
 * This is useful when the screen is approximately vertical. The result is a
 * different physical quantity from the simple 360 - alpha heading used when
 * the device lies approximately flat, so the PoC exposes both values.
 */
export function headingFromEuler(alpha, beta, gamma) {
  if (![alpha, beta, gamma].every(Number.isFinite)) return null;
  if (Math.abs(beta) < 0.0001 && Math.abs(gamma) < 0.0001) return null;

  const x = beta * DEG_TO_RAD;
  const y = gamma * DEG_TO_RAD;
  const z = alpha * DEG_TO_RAD;

  const cX = Math.cos(x);
  const cY = Math.cos(y);
  const cZ = Math.cos(z);
  const sX = Math.sin(x);
  const sY = Math.sin(y);
  const sZ = Math.sin(z);

  const vX = -cZ * sY - sZ * sX * cY;
  const vY = -sZ * sY + cZ * sX * cY;

  if (Math.abs(vX) < Number.EPSILON && Math.abs(vY) < Number.EPSILON) {
    return null;
  }

  const heading = Math.atan2(vX, vY) * RAD_TO_DEG;
  return normalizeDegrees(heading);
}

export function magneticToTrueHeading(magneticHeading, declinationDegrees) {
  if (!Number.isFinite(magneticHeading) || !Number.isFinite(declinationDegrees)) {
    return null;
  }
  return normalizeDegrees(magneticHeading + declinationDegrees);
}

export function cardinalDirection(heading) {
  const normalized = normalizeDegrees(heading);
  if (normalized === null) return '—';

  const labels = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
  return labels[Math.round(normalized / 45) % labels.length];
}

export function shortestAngleDifference(fromHeading, toHeading) {
  const from = normalizeDegrees(fromHeading);
  const to = normalizeDegrees(toHeading);
  if (from === null || to === null) return null;
  return ((to - from + 540) % 360) - 180;
}
