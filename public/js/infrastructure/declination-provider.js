import { computeWmm2025 } from '../vendor/geomagnetism-wmm2025.js';

const WMM2025_DATA_URL = '/data/wmm-2025.json';

let modelPromise = null;

function validateCoordinate(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError('磁気偏角の計算には有効な緯度・経度が必要です。');
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new RangeError('磁気偏角の計算対象座標が範囲外です。');
  }
}

async function loadWmm2025Data() {
  if (!modelPromise) {
    modelPromise = fetch(WMM2025_DATA_URL, {
      cache: 'force-cache',
      credentials: 'same-origin',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`WMM2025 data could not be loaded: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        modelPromise = null;
        throw error;
      });
  }

  return modelPromise;
}

export async function getMagneticDeclination(latitude, longitude, date = new Date()) {
  validateCoordinate(latitude, longitude);

  try {
    const modelData = await loadWmm2025Data();
    const magneticElements = computeWmm2025(modelData, latitude, longitude, date);
    const degrees = Number(magneticElements?.decl);

    if (!Number.isFinite(degrees)) {
      throw new Error('WMM2025から磁気偏角を取得できませんでした。');
    }

    return {
      degrees,
      model: 'WMM2025',
      implementation: 'same-origin geomagnetism@0.2.0 adaptation',
      calculatedAt: date.toISOString(),
    };
  } catch (error) {
    const wrapped = new Error('磁気偏角を端末内で自動計算できませんでした。ページを再読み込みして、もう一度お試しください。');
    wrapped.code = 'declination-unavailable';
    wrapped.cause = error;
    throw wrapped;
  }
}
