import {
  greatCircleDistanceMeters,
  initialBearingDegrees,
} from '../core/bearing-engine.js';
import {
  cardinalDirection,
  magneticToTrueHeading,
} from '../core/heading-normalizer.js';
import { evaluateAlignment } from '../core/alignment-engine.js';

export class DirectionSessionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DirectionSessionError';
    this.code = code;
  }
}

function validatePoint(point, label) {
  if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    throw new DirectionSessionError(
      'INVALID_COORDINATES',
      `${label}の緯度・経度を確認できません`
    );
  }
}

export function createDirectionSession({
  selectedPlace,
  currentPosition,
}) {
  validatePoint(selectedPlace, '目的地');
  validatePoint(currentPosition, '現在地');

  const targetBearing = initialBearingDegrees(currentPosition, selectedPlace);
  if (targetBearing === null) {
    throw new DirectionSessionError(
      'SAME_LOCATION',
      '現在地と目的地が同じため方角を計算できません'
    );
  }

  const distanceMeters = greatCircleDistanceMeters(currentPosition, selectedPlace);

  return {
    selectedPlaceId: selectedPlace.id ?? null,
    selectedPlaceName: selectedPlace.name ?? '目的地',
    currentPosition: {
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
      accuracyMeters: Number.isFinite(currentPosition.accuracyMeters)
        ? currentPosition.accuracyMeters
        : null,
    },
    targetPosition: {
      latitude: selectedPlace.latitude,
      longitude: selectedPlace.longitude,
    },
    targetBearing,
    targetDirectionLabel: cardinalDirection(targetBearing),
    distanceMeters,
    currentHeading: null,
    relativeAngle: null,
    alignment: {
      aligned: false,
      direction: 'unknown',
      message: 'コンパスを確認しています。',
    },
  };
}

export function updateDirectionSessionHeading(
  session,
  magneticHeading,
  declinationDegrees,
  toleranceDegrees = 5
) {
  if (!session || !Number.isFinite(session.targetBearing)) {
    throw new DirectionSessionError(
      'SESSION_UNAVAILABLE',
      '方角案内の状態を確認できません'
    );
  }

  const trueHeading = magneticToTrueHeading(magneticHeading, declinationDegrees);
  if (trueHeading === null) {
    return {
      ...session,
      currentHeading: null,
      relativeAngle: null,
      alignment: {
        aligned: false,
        direction: 'unknown',
        message: 'コンパスを利用できません。',
      },
    };
  }

  const evaluation = evaluateAlignment(
    trueHeading,
    session.targetBearing,
    toleranceDegrees
  );

  return {
    ...session,
    currentHeading: trueHeading,
    relativeAngle: evaluation.delta === null ? null : -evaluation.delta,
    alignment: evaluation,
  };
}
