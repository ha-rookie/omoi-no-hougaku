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
import { AppView } from './js/ui/app-view.js';

const view = new AppView();
let repository;
let candidate = null;
let selectedId = null;

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
        selectedId = id;
        const selected = repository.list().find((place) => place.id === id) ?? null;
        view.showSelected(selected);
        loadPlaces();
      },
      onDelete: (id) => {
        const place = repository.list().find((item) => item.id === id);
        if (!place) return;

        if (!window.confirm(`「${place.name}」を削除しますか？`)) return;

        try {
          repository.remove(id);
          if (selectedId === id) {
            selectedId = null;
            view.showSelected(null);
          }
          loadPlaces();
          view.setStatus('場所を削除しました。', 'ok');
        } catch (error) {
          handleError(error);
        }
      },
    });

    const selected = places.find((place) => place.id === selectedId) ?? null;
    view.showSelected(selected);
  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  if (
    error instanceof PlaceRepositoryError ||
    error instanceof SharedPlaceError ||
    error instanceof LocationResolverClientError
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

view.onSave((name) => {
  if (!repository || !candidate) {
    view.setStatus('保存する場所がありません。Google Mapsから共有してください。', 'error');
    return;
  }

  try {
    const saved = registerPlace(repository, candidate, name);
    candidate = null;
    selectedId = saved.id;
    view.hideCandidate();
    loadPlaces();
    view.setStatus('この場所を端末に保存しました。', 'ok');
  } catch (error) {
    handleError(error);
  }
});

await registerServiceWorker();
readShareFragment();
