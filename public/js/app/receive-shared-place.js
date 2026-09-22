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

  const messages = {
    'invalid-coordinate-title': '共有された座標が正しくありません',
    'unconfirmed-pin-title': 'この共有内容から場所を安全に確定できませんでした',
    'maps-url-not-found': 'Google Mapsの共有URLを確認できませんでした',
  };

  throw new SharedPlaceError(
    classified.reason ?? 'UNSUPPORTED_SHARE',
    messages[classified.reason] ?? 'Google Mapsの共有内容から場所を確認できませんでした'
  );
}
