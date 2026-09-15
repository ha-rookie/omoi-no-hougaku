import { classifySharedPayload } from '../core/shared-payload-classifier.mjs';

export class SharedPlaceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SharedPlaceError';
    this.code = code;
  }
}

export async function receiveSharedPlace(payload, { resolveMapsUrl }) {
  const classified = classifySharedPayload(payload);

  if (classified.kind === 'coordinate') {
    return {
      latitude: classified.latitude,
      longitude: classified.longitude,
      suggestedName: '',
      sourceType: classified.sourceType,
      apiCalled: false,
    };
  }

  if (classified.kind === 'maps-url') {
    const resolved = await resolveMapsUrl(classified.mapsUrl);
    return {
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      suggestedName: classified.suggestedName,
      sourceType: classified.sourceType,
      apiCalled: true,
    };
  }

  const messages = {
    'invalid-coordinate-title': '共有された座標が正しくありません',
    'unconfirmed-pin-title': 'この共有内容から場所を安全に確定できませんでした',
    'maps-url-not-found': 'Google Mapsの共有URLを確認できませんでした',
  };

  throw new SharedPlaceError(
    classified.reason || 'UNSUPPORTED_SHARE',
    messages[classified.reason] || '共有された場所を読み取れませんでした'
  );
}
