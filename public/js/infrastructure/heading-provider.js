import {
  headingFromAbsoluteAlpha,
  headingFromEuler,
} from '../core/heading-normalizer.js';

export class HeadingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HeadingError';
    this.code = code;
  }
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function getScreenAngle() {
  const orientationAngle = globalThis.screen?.orientation?.angle;
  if (isFiniteNumber(orientationAngle)) return orientationAngle;

  const legacyAngle = globalThis.orientation;
  if (isFiniteNumber(legacyAngle)) return legacyAngle;

  return 0;
}

function getPosture(beta, gamma) {
  if (!isFiniteNumber(beta) || !isFiniteNumber(gamma)) return '不明';

  if (Math.abs(beta) <= 30 && Math.abs(gamma) <= 30) {
    return '水平に近い';
  }

  if (Math.abs(Math.abs(beta) - 90) <= 30 || Math.abs(Math.abs(gamma) - 90) <= 30) {
    return '垂直に近い';
  }

  return '傾きあり';
}

/**
 * Select the physical direction that Yohai Compass guides with.
 *
 * The product UI means "the direction the top of the smartphone points".
 * For an absolute DeviceOrientation event, alpha represents rotation around
 * the earth Z axis relative to the device's standard (portrait) orientation,
 * so 360 - alpha is the relevant top-edge azimuth.
 *
 * headingFromEuler() is kept as a diagnostic value only. It represents a
 * different projected device vector when the phone is tilted and must not
 * replace the top-edge heading merely because posture is not flat.
 */
export function selectHeadingForGuidance({
  webkitHeading,
  absolute,
  alphaHeading,
}) {
  if (isFiniteNumber(webkitHeading) && webkitHeading >= 0) {
    return {
      heading: webkitHeading,
      source: 'webkitCompassHeading',
    };
  }

  if (absolute && isFiniteNumber(alphaHeading)) {
    return {
      heading: alphaHeading,
      source: 'absolute-alpha',
    };
  }

  return {
    heading: null,
    source: 'relative-orientation-only',
  };
}

export function isHeadingSupported() {
  return 'DeviceOrientationEvent' in globalThis;
}

export async function requestHeadingPermission() {
  if (!isHeadingSupported()) {
    throw new HeadingError('unsupported', 'このブラウザではDevice Orientation APIを利用できません。');
  }

  const requestPermission = globalThis.DeviceOrientationEvent?.requestPermission;
  if (typeof requestPermission !== 'function') {
    return 'not-required';
  }

  try {
    // Absolute orientation requests magnetometer access where the browser
    // implements the 2026 Device Orientation permission API.
    const result = await requestPermission.call(globalThis.DeviceOrientationEvent, true);
    if (result !== 'granted') {
      throw new HeadingError('permission-denied', 'コンパス利用が許可されませんでした。ブラウザの権限設定を確認してください。');
    }
    return result;
  } catch (error) {
    if (error instanceof HeadingError) throw error;

    throw new HeadingError(
      'permission-error',
      'コンパス権限を要求できませんでした。ページを再読み込みし、ボタン操作からもう一度お試しください。',
    );
  }
}

function createReading(event, eventType, state) {
  const alpha = isFiniteNumber(event.alpha) ? event.alpha : null;
  const beta = isFiniteNumber(event.beta) ? event.beta : null;
  const gamma = isFiniteNumber(event.gamma) ? event.gamma : null;
  const absolute = eventType === 'deviceorientationabsolute' || event.absolute === true;

  const webkitHeading = isFiniteNumber(event.webkitCompassHeading) && event.webkitCompassHeading >= 0
    ? event.webkitCompassHeading
    : null;
  const webkitAccuracy = isFiniteNumber(event.webkitCompassAccuracy)
    ? event.webkitCompassAccuracy
    : null;

  const alphaHeading = absolute ? headingFromAbsoluteAlpha(alpha) : null;
  const w3cFacingHeading = absolute ? headingFromEuler(alpha, beta, gamma) : null;
  const posture = getPosture(beta, gamma);
  const selected = selectHeadingForGuidance({
    webkitHeading,
    absolute,
    alphaHeading,
  });

  const now = performance.now();
  const intervalMs = state.lastReadingAt === null ? null : Math.round(now - state.lastReadingAt);
  state.lastReadingAt = now;

  return {
    heading: selected.heading,
    source: selected.source,
    usable: selected.heading !== null,
    eventType,
    absolute,
    alpha,
    beta,
    gamma,
    alphaHeading,
    // Diagnostic only: this is not the top-edge heading used by Guidance.
    w3cFacingHeading,
    webkitHeading,
    webkitAccuracy,
    posture,
    screenAngle: getScreenAngle(),
    intervalMs,
  };
}

export function startHeadingUpdates(onReading, onError) {
  if (!isHeadingSupported()) {
    throw new HeadingError('unsupported', 'このブラウザではDevice Orientation APIを利用できません。');
  }

  const state = {
    sawAbsoluteEvent: false,
    lastReadingAt: null,
    receivedAnyEvent: false,
  };

  const noEventTimer = globalThis.setTimeout(() => {
    if (!state.receivedAnyEvent) {
      onError?.(new HeadingError(
        'no-events',
        '端末方位イベントを受信できません。センサー対応とブラウザ権限を確認してください。',
      ));
    }
  }, 4000);

  const handleAbsolute = (event) => {
    state.receivedAnyEvent = true;
    state.sawAbsoluteEvent = true;
    globalThis.clearTimeout(noEventTimer);
    onReading?.(createReading(event, 'deviceorientationabsolute', state));
  };

  const handleOrientation = (event) => {
    state.receivedAnyEvent = true;
    globalThis.clearTimeout(noEventTimer);

    const hasWebkitHeading = isFiniteNumber(event.webkitCompassHeading) && event.webkitCompassHeading >= 0;
    if (state.sawAbsoluteEvent && !hasWebkitHeading) {
      return;
    }

    onReading?.(createReading(event, 'deviceorientation', state));
  };

  globalThis.addEventListener('deviceorientationabsolute', handleAbsolute, true);
  globalThis.addEventListener('deviceorientation', handleOrientation, true);

  return () => {
    globalThis.clearTimeout(noEventTimer);
    globalThis.removeEventListener('deviceorientationabsolute', handleAbsolute, true);
    globalThis.removeEventListener('deviceorientation', handleOrientation, true);
  };
}
