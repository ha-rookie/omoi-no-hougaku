import assert from 'node:assert/strict';
import { parseCoordinateTitle } from '../public/js/core/coordinate-validator.mjs';
import { classifySharedPayload } from '../public/js/core/shared-payload-classifier.mjs';
import { receiveSharedPlace } from '../public/js/app/receive-shared-place.mjs';
import {
  MAX_SAVED_PLACES,
  PlaceRepository,
  PlaceStorageError,
  STORAGE_KEY,
} from '../public/js/infrastructure/place-repository.mjs';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }
}

assert.deepEqual(parseCoordinateTitle('34.950599,136.767197'), {
  latitude: 34.950599,
  longitude: 136.767197,
});
assert.equal(parseCoordinateTitle('91,136'), null);
assert.equal(parseCoordinateTitle('34.95,181'), null);

assert.deepEqual(
  classifySharedPayload({
    title: '34.950599,136.767197',
    text: 'https://maps.app.goo.gl/D9b8NjBYiHjHxuRdA',
  }),
  {
    kind: 'coordinate',
    latitude: 34.950599,
    longitude: 136.767197,
    suggestedName: '',
    sourceType: 'shared-title-coordinate',
  }
);

const facility = classifySharedPayload({
  title: 'テスト施設',
  text: 'https://maps.app.goo.gl/example?g_st=ac',
});
assert.equal(facility.kind, 'maps-url');
assert.equal(facility.suggestedName, 'テスト施設');

const genericPin = classifySharedPayload({
  title: '指定した地点',
  text: 'https://maps.app.goo.gl/example',
});
assert.equal(genericPin.kind, 'unsupported');
assert.equal(genericPin.reason, 'unconfirmed-pin-title');

let apiCallCount = 0;
const coordinateCandidate = await receiveSharedPlace({
  title: '34.950599,136.767197',
  text: 'https://maps.app.goo.gl/example',
}, {
  resolveMapsUrl: async () => {
    apiCallCount += 1;
    throw new Error('must not be called');
  },
});
assert.equal(apiCallCount, 0);
assert.equal(coordinateCandidate.apiCalled, false);
assert.equal(coordinateCandidate.latitude, 34.950599);

const facilityCandidate = await receiveSharedPlace({
  title: 'テスト施設',
  text: 'https://maps.app.goo.gl/example',
}, {
  resolveMapsUrl: async (url) => {
    apiCallCount += 1;
    assert.equal(url, 'https://maps.app.goo.gl/example');
    return { latitude: 35.1, longitude: 136.9, placeId: 'test-place' };
  },
});
assert.equal(apiCallCount, 1);
assert.equal(facilityCandidate.apiCalled, true);
assert.equal(facilityCandidate.suggestedName, 'テスト施設');

const storage = new MemoryStorage();
let sequence = 0;
const repository = new PlaceRepository({
  storage,
  now: () => '2026-09-15T00:00:00.000Z',
  idFactory: () => `id-${++sequence}`,
});

for (let index = 0; index < MAX_SAVED_PLACES; index += 1) {
  repository.add({
    name: `場所${index + 1}`,
    latitude: 35 + index * 0.01,
    longitude: 136 + index * 0.01,
  });
}

assert.equal(repository.load().length, 5);
assert.throws(
  () => repository.add({ name: '6件目', latitude: 35.5, longitude: 136.5 }),
  (error) => error instanceof PlaceStorageError && error.code === 'LIMIT_EXCEEDED'
);

const firstId = repository.load()[0].id;
assert.equal(repository.delete(firstId), true);
assert.equal(repository.load().length, 4);

const reloadedRepository = new PlaceRepository({ storage });
assert.equal(reloadedRepository.load().length, 4);

storage.setItem(STORAGE_KEY, '{broken-json');
assert.throws(
  () => reloadedRepository.load(),
  (error) => error instanceof PlaceStorageError && error.code === 'CORRUPT_DATA'
);

console.log('production place registration tests: OK');
