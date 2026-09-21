import assert from 'node:assert/strict';
import {
  MAX_SAVED_PLACES,
  PlaceRepository,
  PlaceRepositoryError,
} from '../public/js/infrastructure/place-repository.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

function createRepository(storage = new MemoryStorage()) {
  let id = 0;
  return new PlaceRepository({
    storage,
    idFactory: () => `id-${++id}`,
    now: () => new Date('2026-09-22T00:00:00.000Z'),
  });
}

{
  const storage = new MemoryStorage();
  const repository = createRepository(storage);

  const saved = repository.save({
    name: '  故郷  ',
    latitude: 35,
    longitude: 139,
  });

  assert.equal(saved.name, '故郷');
  assert.equal(repository.list().length, 1);

  const reloaded = createRepository(storage);
  assert.deepEqual(reloaded.list()[0], saved);

  assert.equal(repository.remove(saved.id), true);
  assert.deepEqual(repository.list(), []);
  assert.equal(createRepository(storage).list().length, 0);
}

{
  const repository = createRepository();
  for (let i = 0; i < MAX_SAVED_PLACES; i += 1) {
    repository.save({
      name: `場所${i + 1}`,
      latitude: 30 + i,
      longitude: 130 + i,
    });
  }

  assert.equal(repository.list().length, MAX_SAVED_PLACES);

  assert.throws(
    () =>
      repository.save({
        name: '6件目',
        latitude: 35,
        longitude: 135,
      }),
    (error) => {
      assert.ok(error instanceof PlaceRepositoryError);
      assert.equal(error.code, 'PLACE_LIMIT_REACHED');
      return true;
    }
  );
}

{
  const repository = createRepository();

  assert.throws(
    () => repository.save({ name: '   ', latitude: 35, longitude: 139 }),
    (error) => error.code === 'NAME_REQUIRED'
  );

  assert.throws(
    () => repository.save({ name: 'x'.repeat(41), latitude: 35, longitude: 139 }),
    (error) => error.code === 'NAME_TOO_LONG'
  );

  assert.throws(
    () => repository.save({ name: '場所', latitude: 91, longitude: 139 }),
    (error) => error.code === 'INVALID_COORDINATES'
  );
}

{
  const storage = new MemoryStorage();
  storage.setItem(
    'omoi-no-hougaku.saved-places',
    JSON.stringify({
      schemaVersion: 1,
      places: [{ id: 'broken' }],
    })
  );

  const repository = createRepository(storage);
  assert.throws(
    () => repository.list(),
    (error) => {
      assert.ok(error instanceof PlaceRepositoryError);
      assert.equal(error.code, 'CORRUPT_STORAGE');
      return true;
    }
  );
}

console.log('place repository tests: OK');
