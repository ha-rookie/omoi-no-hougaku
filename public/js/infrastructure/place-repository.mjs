import { isValidCoordinate } from '../core/coordinate-validator.mjs';

export const STORAGE_KEY = 'omoi-no-hougaku.saved-places.v1';
export const STORAGE_SCHEMA_VERSION = 1;
export const MAX_SAVED_PLACES = 5;
export const MAX_PLACE_NAME_LENGTH = 40;

export class PlaceStorageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PlaceStorageError';
    this.code = code;
  }
}

function normalizeName(value) {
  if (typeof value !== 'string') {
    throw new PlaceStorageError('INVALID_NAME', '場所の名前を入力してください');
  }
  const name = value.trim();
  if (!name) {
    throw new PlaceStorageError('INVALID_NAME', '場所の名前を入力してください');
  }
  if (name.length > MAX_PLACE_NAME_LENGTH) {
    throw new PlaceStorageError('NAME_TOO_LONG', `場所の名前は${MAX_PLACE_NAME_LENGTH}文字以内にしてください`);
  }
  return name;
}

function isValidStoredPlace(place) {
  return place
    && typeof place === 'object'
    && typeof place.id === 'string'
    && place.id.length > 0
    && place.id.length <= 128
    && typeof place.name === 'string'
    && place.name.length > 0
    && place.name.length <= MAX_PLACE_NAME_LENGTH
    && isValidCoordinate(place.latitude, place.longitude)
    && typeof place.createdAt === 'string'
    && place.createdAt.length > 0;
}

export class PlaceRepository {
  constructor({
    storage = globalThis.localStorage,
    now = () => new Date().toISOString(),
    idFactory = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  } = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new PlaceStorageError('STORAGE_UNAVAILABLE', 'この端末では場所を保存できません');
    }
    this.storage = storage;
    this.now = now;
    this.idFactory = idFactory;
  }

  load() {
    let raw;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      throw new PlaceStorageError('STORAGE_UNAVAILABLE', '保存した場所を読み込めません');
    }

    if (raw == null) return [];

    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      throw new PlaceStorageError('CORRUPT_DATA', '保存データを読み取れません');
    }

    if (
      !envelope
      || envelope.schemaVersion !== STORAGE_SCHEMA_VERSION
      || !Array.isArray(envelope.places)
      || envelope.places.length > MAX_SAVED_PLACES
      || !envelope.places.every(isValidStoredPlace)
    ) {
      throw new PlaceStorageError('CORRUPT_DATA', '保存データの形式を確認できません');
    }

    return envelope.places.map((place) => ({ ...place }));
  }

  add({ name, latitude, longitude }) {
    const normalizedName = normalizeName(name);
    if (!isValidCoordinate(latitude, longitude)) {
      throw new PlaceStorageError('INVALID_COORDINATES', '場所の座標を確認できません');
    }

    const places = this.load();
    if (places.length >= MAX_SAVED_PLACES) {
      throw new PlaceStorageError('LIMIT_EXCEEDED', `保存できる場所は最大${MAX_SAVED_PLACES}件です`);
    }

    const place = {
      id: String(this.idFactory()),
      name: normalizedName,
      latitude,
      longitude,
      createdAt: String(this.now()),
    };

    if (!isValidStoredPlace(place)) {
      throw new PlaceStorageError('INVALID_PLACE', '保存する場所の情報を確認できません');
    }

    this.#write([...places, place]);
    return { ...place };
  }

  delete(id) {
    if (typeof id !== 'string' || !id) {
      throw new PlaceStorageError('INVALID_ID', '削除する場所を確認できません');
    }

    const places = this.load();
    const next = places.filter((place) => place.id !== id);
    if (next.length === places.length) return false;
    this.#write(next);
    return true;
  }

  #write(places) {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        places,
      }));
    } catch {
      throw new PlaceStorageError('STORAGE_UNAVAILABLE', '場所を端末へ保存できませんでした');
    }
  }
}
