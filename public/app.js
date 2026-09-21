import {
  LocationResolverClientError,
  resolveLocationFromMapsUrl,
} from './js/infrastructure/location-resolver-client.js';
import {
  PlaceRepository,
  PlaceRepositoryError,
} from './js/infrastructure/place-repository.js';
import {
  SharedPlaceError,
  receiveSharedPlace,
} from './js/app/receive-shared-place.js';
import { registerPlace } from './js/app/register-place.js';
import { shouldEnterAlignedState } from './js/app/alignment-transition.js';
import {
  createDirectionSession,
  DirectionSessionError,
  updateDirectionSessionHeading,
} from './js/app/direction-session.js';
import {
  GeolocationError,
  getCurrentLocation,
} from './js/infrastructure/location-provider.js';
import {
  HeadingError,
  isHeadingSupported,
  requestHeadingPermission,
  startHeadingUpdates,
} from './js/infrastructure/heading-provider.js';
import { getMagneticDeclination } from './js/infrastructure/declination-provider.js';
import { renderMapOverview } from './js/ui/map-overview.js';
import { AppView } from './js/ui/app-view.js';

const view = new AppView();
let repository;
let candidate = null;
let selectedId = null;
let activeDirectionSession = null;
let activeDeclinationDegrees = null;
let latestHeadingReading = null;
let stopHeadingUpdates = null;
let directionRunId = 0;
let directionViewMode = 'compass';
let mapRenderId = 0;
let alignedForCurrentRun = false;

function stopDirectionRuntime() {
  directionRunId += 1;
  mapRenderId += 1;
  directionViewMode = 'compass';
  alignedForCurrentRun = false;
  stopHeadingUpdates?.();
  stopHeadingUpdates = null;
  activeDirectionSession = null;
  activeDeclinationDegrees = null;
  latestHeadingReading = null;
}

function selectedPlace() {
  if (!repository || !selectedId) return null;
  return repository.list().find((place) => place.id === selectedId) ?? null;
}

function applyLatestHeading() {
  if (
    !activeDirectionSession ||
    !latestHeadingReading?.usable ||
    !Number.isFinite(activeDeclinationDegrees)
  ) {
    return;
  }

  activeDirectionSession = updateDirectionSessionHeading(
    activeDirectionSession,
    latestHeadingReading.heading,
    activeDeclinationDegrees
  );
  view.renderDirectionHeading(activeDirectionSession);

  if (
    shouldEnterAlignedState({
      session: activeDirectionSession,
      viewMode: directionViewMode,
      alreadyAligned: alignedForCurrentRun,
    })
  ) {
    alignedForCurrentRun = true;
    stopHeadingUpdates?.();
    stopHeadingUpdates = null;
    latestHeadingReading = null;
    view.showAligned(activeDirectionSession);
  }
}

async function startDirection() {
  const place = selectedPlace();
  if (!place) {
    view.setStatus('方角を見る場所を選んでください。', 'error');
    return;
  }

  stopDirectionRuntime();
  alignedForCurrentRun = false;
  const runId = directionRunId;
  view.showDirectionLoading(place);

  let headingPermissionError = null;
  const headingPermissionPromise = isHeadingSupported()
    ? requestHeadingPermission()
        .then(() => true)
        .catch((error) => {
          headingPermissionError = error;
          return false;
        })
    : Promise.resolve(false);

  try {
    const currentPosition = await getCurrentLocation();
    if (runId !== directionRunId) return;

    activeDirectionSession = createDirectionSession({
      selectedPlace: place,
      currentPosition,
    });
    view.renderDirectionSession(activeDirectionSession);

    const headingAllowed = await headingPermissionPromise;
    if (runId !== directionRunId) return;

    if (!headingAllowed) {
      view.setCompassUnavailable(
        headingPermissionError?.message ??
          'この端末ではコンパスを利用できません。方位角と距離は確認できます。'
      );
      return;
    }

    try {
      const declination = await getMagneticDeclination(
        currentPosition.latitude,
        currentPosition.longitude,
        new Date()
      );
      if (runId !== directionRunId) return;
      activeDeclinationDegrees = declination.degrees;
    } catch (error) {
      view.setCompassUnavailable(
        error?.message ??
          '磁気偏角を確認できないため、コンパス追従を利用できません。'
      );
      return;
    }

    try {
      stopHeadingUpdates = startHeadingUpdates(
        (reading) => {
          if (runId !== directionRunId) return;
          latestHeadingReading = reading;
          applyLatestHeading();
        },
        (error) => {
          if (runId !== directionRunId) return;
          view.setCompassUnavailable(error.message);
        }
      );
    } catch (error) {
      view.setCompassUnavailable(
        error?.message ??
          'コンパスを開始できません。方位角と距離は確認できます。'
      );
    }
  } catch (error) {
    if (runId !== directionRunId) return;

    if (
      error instanceof GeolocationError ||
      error instanceof DirectionSessionError
    ) {
      view.showDirectionError(error.message);
      return;
    }

    view.showDirectionError('現在地から目的地の方角を確認できませんでした。');
  }
}

async function changeDirectionMode(mode) {
  directionViewMode = mode === 'map' ? 'map' : 'compass';
  view.setDirectionMode(directionViewMode);

  if (directionViewMode !== 'map') {
    mapRenderId += 1;
    return;
  }

  if (!activeDirectionSession) {
    view.showMapError('現在地と目的地を確認してから地図を表示します。');
    return;
  }

  const renderId = ++mapRenderId;
  const runId = directionRunId;
  const session = activeDirectionSession;

  view.showMapLoading();

  try {
    const result = await renderMapOverview({
      container: view.getMapOverviewContainer(),
      current: session.currentPosition,
      target: session.targetPosition,
      targetName: session.selectedPlaceName,
      distanceMeters: session.distanceMeters,
      targetBearing: session.targetBearing,
      targetDirectionLabel: session.targetDirectionLabel,
      shouldCommit: () =>
        renderId === mapRenderId &&
        runId === directionRunId &&
        directionViewMode === 'map',
    });

    if (
      result?.committed &&
      renderId === mapRenderId &&
      runId === directionRunId &&
      directionViewMode === 'map'
    ) {
      view.showMapReady(result);
    }
  } catch {
    if (
      renderId === mapRenderId &&
      runId === directionRunId &&
      directionViewMode === 'map'
    ) {
      view.showMapError(
        '地図を表示できませんでした。コンパスと方位・距離は引き続き利用できます。'
      );
    }
  }
}

function clearShareFragment() {
  history.replaceState(null, '', `${location.pathname}${location.search}`);
}

function loadPlaces() {
  try {
    const places = repository.list();
    if (selectedId && !places.some((place) => place.id === selectedId)) {
      selectedId = null;
    }

    view.renderPlaces(places, {
      selectedId,
      onSelect: (id) => {
        stopDirectionRuntime();
        view.hideDirection();
        selectedId = id;
        loadPlaces();
        void startDirection();
      },
      onDelete: (id) => {
        const place = repository.list().find((item) => item.id === id);
        if (!place) return;

        if (!window.confirm(`「${place.name}」を削除しますか？`)) return;

        try {
          repository.remove(id);
          if (selectedId === id) {
            stopDirectionRuntime();
            view.hideDirection();
            selectedId = null;
          }
          loadPlaces();
          view.setStatus('場所を削除しました。', 'ok');
        } catch (error) {
          handleError(error);
        }
      },
    });

  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  if (
    error instanceof PlaceRepositoryError ||
    error instanceof SharedPlaceError ||
    error instanceof LocationResolverClientError ||
    error instanceof GeolocationError ||
    error instanceof HeadingError ||
    error instanceof DirectionSessionError
  ) {
    view.setStatus(error.message, 'error');
    return;
  }

  view.setStatus('処理中に予期しないエラーが発生しました。', 'error');
}

async function handleSharedPayload(payload) {
  view.setStatus('共有された場所を確認しています…');

  try {
    candidate = await receiveSharedPlace(payload, {
      resolveMapsUrl: resolveLocationFromMapsUrl,
    });
    view.showCandidate(candidate);
    view.setStatus('場所を受け取りました。名前を付けて保存できます。', 'ok');
  } catch (error) {
    candidate = null;
    view.hideCandidate();
    handleError(error);
  }
}

function readShareFragment() {
  if (location.hash === '#share-error=1') {
    clearShareFragment();
    view.setStatus('共有データを読み取れませんでした。', 'error');
    return;
  }

  const prefix = '#share=';
  if (!location.hash.startsWith(prefix)) return;

  const raw = location.hash.slice(prefix.length);
  clearShareFragment();

  try {
    const payload = JSON.parse(decodeURIComponent(raw));
    handleSharedPayload(payload);
  } catch {
    view.setStatus('共有データの形式が正しくありません。', 'error');
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    view.setStatus('このブラウザは共有受信機能に対応していません。', 'error');
    return;
  }

  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
  } catch {
    view.setStatus('共有受信の準備に失敗しました。', 'error');
  }
}

try {
  repository = new PlaceRepository();
  loadPlaces();
} catch (error) {
  handleError(error);
}

view.onDirectionModeChange(changeDirectionMode);

view.onRestartDirection(() => {
  void startDirection();
});

view.onAlignedCloseDirection(() => {
  stopDirectionRuntime();
  view.hideDirection();
});

view.onCloseDirection(() => {
  stopDirectionRuntime();
  view.hideDirection();
});

view.onSave((name) => {
  if (!repository || !candidate) {
    view.setStatus('保存する場所がありません。Google Mapsから共有してください。', 'error');
    return;
  }

  try {
    registerPlace(repository, candidate, name);
    candidate = null;
    selectedId = null;
    view.hideCandidate();
    loadPlaces();
    view.setStatus('この場所を端末に保存しました。登録一覧から選べます。', 'ok');
  } catch (error) {
    handleError(error);
  }
});

window.addEventListener('pagehide', stopDirectionRuntime);

await registerServiceWorker();
readShareFragment();
