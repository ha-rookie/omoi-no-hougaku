export const STORAGE_SCHEMA_VERSION = 1;
export const MAX_SAVED_PLACES = 5;
export const MAX_PLACE_NAME_LENGTH = 40;
export const DEFAULT_STORAGE_KEY = 'omoi-no-hougaku.saved-places';

export class PlaceRepositoryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PlaceRepositoryError';
    this.code = code;
  }
}

function isValidCoordinates(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeName(rawName) {
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name) {
    throw new PlaceRepositoryError(
      'NAME_REQUIRED',
      'この場所につける名前を入力してください'
    );
  }
  if (name.length > MAX_PLACE_NAME_LENGTH) {
    throw new PlaceRepositoryError(
      'NAME_TOO_LONG',
      `名前は${MAX_PLACE_NAME_LENGTH}文字以内で入力してください`
    );
  }
  return name;
}

function isValidSavedPlace(place) {
  return (
    place &&
    typeof place === 'object' &&
    typeof place.id === 'string' &&
    place.id.length > 0 &&
    typeof place.name === 'string' &&
    place.name.length > 0 &&
    place.name.length <= MAX_PLACE_NAME_LENGTH &&
    isValidCoordinates(place.latitude, place.longitude) &&
    typeof place.createdAt === 'string' &&
    Number.isFinite(Date.parse(place.createdAt))
  );
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `place-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class PlaceRepository {
  constructor({
    storage = globalThis.localStorage,
    storageKey = DEFAULT_STORAGE_KEY,
    idFactory = createId,
    now = () => new Date(),
  } = {}) {
    if (!storage) {
      throw new PlaceRepositoryError(
        'STORAGE_UNAVAILABLE',
        'このブラウザでは場所を保存できません'
      );
    }

    this.storage = storage;
    this.storageKey = storageKey;
    this.idFactory = idFactory;
    this.now = now;
  }

  #readEnvelope() {
    let raw;
    try {
      raw = this.storage.getItem(this.storageKey);
    } catch {
      throw new PlaceRepositoryError(
        'STORAGE_UNAVAILABLE',
        '保存データを読み込めませんでした'
      );
    }

    if (raw === null) {
      return {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        places: [],
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new PlaceRepositoryError(
        'CORRUPT_STORAGE',
        '保存データの形式が壊れています'
      );
    }

    if (
      !parsed ||
      parsed.schemaVersion !== STORAGE_SCHEMA_VERSION ||
      !Array.isArray(parsed.places) ||
      parsed.places.length > MAX_SAVED_PLACES ||
      !parsed.places.every(isValidSavedPlace)
    ) {
      throw new PlaceRepositoryError(
        'CORRUPT_STORAGE',
        '保存データの形式が正しくありません'
      );
    }

    return parsed;
  }

  #writeEnvelope(envelope) {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(envelope));
    } catch {
      throw new PlaceRepositoryError(
        'STORAGE_UNAVAILABLE',
        '場所を保存できませんでした'
      );
    }
  }

  list() {
    return this.#readEnvelope().places.map((place) => ({ ...place }));
  }

  save({ name, latitude, longitude }) {
    const envelope = this.#readEnvelope();
    if (envelope.places.length >= MAX_SAVED_PLACES) {
      throw new PlaceRepositoryError(
        'PLACE_LIMIT_REACHED',
        '保存できる場所は5か所までです。先に1か所削除してください'
      );
    }

    if (!isValidCoordinates(latitude, longitude)) {
      throw new PlaceRepositoryError(
        'INVALID_COORDINATES',
        'この場所の座標を保存できません'
      );
    }

    const place = {
      id: String(this.idFactory()),
      name: normalizeName(name),
      latitude,
      longitude,
      createdAt: this.now().toISOString(),
    };

    const next = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      places: [...envelope.places, place],
    };
    this.#writeEnvelope(next);
    return { ...place };
  }

  remove(id) {
    const envelope = this.#readEnvelope();
    const nextPlaces = envelope.places.filter((place) => place.id !== id);
    if (nextPlaces.length === envelope.places.length) return false;

    this.#writeEnvelope({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      places: nextPlaces,
    });
    return true;
  }
}
