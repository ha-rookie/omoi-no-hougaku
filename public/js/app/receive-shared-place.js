import {
  classifySharedLocation,
  isValidCoordinates,
} from '../core/shared-location.js';

export class SharedPlaceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SharedPlaceError';
    this.code = code;
  }
}

export async function receiveSharedPlace(payload, { resolveMapsUrl }) {
  const classified = classifySharedLocation(payload);

  if (classified.kind === 'coordinate') {
    return {
      latitude: classified.latitude,
      longitude: classified.longitude,
      sourceType: classified.sourceType,
    };
  }

  if (classified.kind === 'maps-url') {
    const resolved = await resolveMapsUrl(classified.mapsUrl);
    if (!isValidCoordinates(resolved?.latitude, resolved?.longitude)) {
      throw new SharedPlaceError(
        'INVALID_RESOLVED_COORDINATES',
        '地点の座標を確認できませんでした'
      );
    }

    return {
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      sourceType: classified.sourceType,
    };
  }

  throw new SharedPlaceError(
    'UNSUPPORTED_SHARE',
    'Google Mapsの共有内容から場所を確認できませんでした'
  );
}
