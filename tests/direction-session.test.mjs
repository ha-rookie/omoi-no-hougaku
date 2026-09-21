import assert from 'node:assert/strict';
import {
  createDirectionSession,
  DirectionSessionError,
  updateDirectionSessionHeading,
} from '../public/js/app/direction-session.js';

{
  const session = createDirectionSession({
    selectedPlace: {
      id: 'tokyo',
      name: '東京',
      latitude: 35.681236,
      longitude: 139.767125,
    },
    currentPosition: {
      latitude: 35.170915,
      longitude: 136.881537,
      accuracyMeters: 10,
    },
  });

  assert.equal(session.selectedPlaceId, 'tokyo');
  assert.equal(session.selectedPlaceName, '東京');
  assert.ok(session.targetBearing >= 0 && session.targetBearing < 360);
  assert.ok(session.distanceMeters > 200000);
  assert.ok(session.targetDirectionLabel);
  assert.equal(session.currentHeading, null);
}

{
  const base = {
    selectedPlaceId: 'target',
    selectedPlaceName: 'Target',
    currentPosition: { latitude: 35, longitude: 136 },
    targetPosition: { latitude: 36, longitude: 136 },
    targetBearing: 0,
    targetDirectionLabel: '北',
    distanceMeters: 1000,
    currentHeading: null,
    relativeAngle: null,
    alignment: { aligned: false, direction: 'unknown', message: '' },
  };

  const aligned = updateDirectionSessionHeading(base, 355, 5, 5);
  assert.equal(aligned.currentHeading, 0);
  assert.equal(aligned.alignment.aligned, true);
  assert.equal(aligned.relativeAngle, 0);

  const turnRight = updateDirectionSessionHeading(base, 330, 0, 5);
  assert.equal(turnRight.alignment.direction, 'right');
  assert.equal(turnRight.alignment.delta, 30);
  assert.equal(turnRight.relativeAngle, -30);
}

assert.throws(
  () =>
    createDirectionSession({
      selectedPlace: {
        id: 'same',
        name: '同じ場所',
        latitude: 35,
        longitude: 136,
      },
      currentPosition: {
        latitude: 35,
        longitude: 136,
      },
    }),
  (error) => {
    assert.ok(error instanceof DirectionSessionError);
    assert.equal(error.code, 'SAME_LOCATION');
    return true;
  }
);

console.log('direction session tests: OK');
