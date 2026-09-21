export class GeolocationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GeolocationError';
    this.code = code;
  }
}

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

function mapError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new GeolocationError('permission-denied', '位置情報の利用が許可されていません。ブラウザの権限設定を確認してください。');
    case error.POSITION_UNAVAILABLE:
      return new GeolocationError('position-unavailable', '現在地を取得できませんでした。場所を変えてもう一度お試しください。');
    case error.TIMEOUT:
      return new GeolocationError('timeout', '現在地の取得がタイムアウトしました。電波状況を確認してもう一度お試しください。');
    default:
      return new GeolocationError('unknown', '現在地の取得中に不明なエラーが発生しました。');
  }
}

export function isGeolocationSupported() {
  return 'geolocation' in navigator;
}

export async function getGeolocationPermissionState() {
  if (!navigator.permissions?.query) {
    return 'unsupported';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch {
    return 'unsupported';
  }
}

export function getCurrentLocation(options = {}) {
  if (!isGeolocationSupported()) {
    return Promise.reject(new GeolocationError('unsupported', 'このブラウザでは位置情報を利用できません。'));
  }

  const startedAt = performance.now();

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracyMeters: position.coords.altitudeAccuracy,
          timestamp: position.timestamp,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      },
      (error) => reject(mapError(error)),
      { ...DEFAULT_OPTIONS, ...options },
    );
  });
}
