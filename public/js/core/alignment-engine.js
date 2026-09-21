import { shortestAngleDifference } from './heading-normalizer.js';

export function evaluateAlignment(currentHeading, targetBearing, toleranceDegrees = 5) {
  const delta = shortestAngleDifference(currentHeading, targetBearing);
  if (delta === null) {
    return {
      delta: null,
      aligned: false,
      direction: 'unknown',
      message: '方位差を計算できません。',
    };
  }

  const aligned = Math.abs(delta) <= Math.abs(toleranceDegrees);
  if (aligned) {
    return {
      delta,
      aligned: true,
      direction: 'aligned',
      message: 'こちらの方角です。',
    };
  }

  const direction = delta > 0 ? 'right' : 'left';
  return {
    delta,
    aligned: false,
    direction,
    message: `${direction === 'right' ? '右' : '左'}へ約${Math.round(Math.abs(delta))}°`,
  };
}
