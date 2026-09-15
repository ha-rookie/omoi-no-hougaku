import { receiveSharedPlace } from './app/receive-shared-place.mjs';
import { registerPlace } from './app/register-place.mjs';
import { resolveLocationFromMapsUrl } from './infrastructure/location-resolver-client.mjs';
import {
  MAX_SAVED_PLACES,
  PlaceRepository,
  PlaceStorageError,
} from './infrastructure/place-repository.mjs';

const candidateCard = document.querySelector('#candidate-card');
const candidateCoordinates = document.querySelector('#candidate-coordinates');
const candidateNote = document.querySelector('#candidate-note');
const placeForm = document.querySelector('#place-form');
const placeName = document.querySelector('#place-name');
const cancelCandidate = document.querySelector('#cancel-candidate');
const savedList = document.querySelector('#saved-list');
const savedEmpty = document.querySelector('#saved-empty');
const placeCount = document.querySelector('#place-count');
const statusElement = document.querySelector('#status');

let currentCandidate = null;
let repository = null;

function setStatus(message, kind = '') {
  statusElement.textContent = message;
  statusElement.className = `status ${kind}`.trim();
}

function formatCoordinate(value) {
  return Number(value).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function showCandidate(candidate) {
  currentCandidate = candidate;
  candidateCoordinates.textContent = `${formatCoordinate(candidate.latitude)}, ${formatCoordinate(candidate.longitude)}`;
  placeName.value = candidate.suggestedName || '';
  candidateNote.textContent = candidate.apiCalled
    ? 'Google Mapsの共有URLをGoogle公式APIで確認した地点です。保存後の名前と座標は端末内だけに保存します。'
    : '共有された座標を端末内で確認しました。Google APIは呼んでいません。';
  candidateCard.hidden = false;
  placeName.focus();
}

function clearCandidate() {
  currentCandidate = null;
  placeForm.reset();
  candidateCoordinates.textContent = '';
  candidateNote.textContent = '';
  candidateCard.hidden = true;
}

function renderSavedPlaces() {
  savedList.replaceChildren();

  if (!repository) {
    placeCount.textContent = '';
    savedEmpty.hidden = false;
    return;
  }

  let places;
  try {
    places = repository.load();
  } catch (error) {
    const message = error instanceof PlaceStorageError
      ? error.message
      : '保存した場所を読み込めませんでした';
    setStatus(message, 'error');
    placeCount.textContent = '';
    savedEmpty.hidden = false;
    return;
  }

  placeCount.textContent = `${places.length}/${MAX_SAVED_PLACES}`;
  savedEmpty.hidden = places.length !== 0;

  for (const place of places) {
    const item = document.createElement('li');
    item.className = 'place';

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'place-name';
    name.textContent = place.name;

    const meta = document.createElement('div');
    meta.className = 'place-meta';
    meta.textContent = `${formatCoordinate(place.latitude)}, ${formatCoordinate(place.longitude)}`;

    info.append(name, meta);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger';
    deleteButton.textContent = '削除';
    deleteButton.setAttribute('aria-label', `${place.name}を削除`);
    deleteButton.addEventListener('click', () => {
      try {
        repository.delete(place.id);
        setStatus('場所を削除しました。', 'ok');
        renderSavedPlaces();
      } catch (error) {
        setStatus(error?.message || '場所を削除できませんでした', 'error');
      }
    });

    item.append(info, deleteButton);
    savedList.append(item);
  }
}

async function handleSharedPayload(payload) {
  setStatus('共有された場所を確認しています…');
  clearCandidate();

  try {
    const candidate = await receiveSharedPlace(payload, {
      resolveMapsUrl: resolveLocationFromMapsUrl,
    });
    showCandidate(candidate);
    setStatus('場所を確認できました。名前を付けて保存してください。', 'ok');
  } catch (error) {
    setStatus(error?.message || '共有された場所を読み取れませんでした', 'error');
  }
}

function readSharedPayloadFromHash() {
  if (location.hash === '#share-error=1') {
    history.replaceState(null, '', location.pathname);
    setStatus('共有データを読み取れませんでした。', 'error');
    return;
  }

  const prefix = '#share=';
  if (!location.hash.startsWith(prefix)) return;

  try {
    const payload = JSON.parse(decodeURIComponent(location.hash.slice(prefix.length)));
    history.replaceState(null, '', location.pathname);
    handleSharedPayload(payload);
  } catch {
    history.replaceState(null, '', location.pathname);
    setStatus('共有データを読み取れませんでした。', 'error');
  }
}

placeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!repository || !currentCandidate) {
    setStatus('保存する場所を確認できません。', 'error');
    return;
  }

  try {
    registerPlace(currentCandidate, placeName.value, { repository });
    clearCandidate();
    renderSavedPlaces();
    setStatus('この端末に場所を保存しました。', 'ok');
  } catch (error) {
    setStatus(error?.message || '場所を保存できませんでした', 'error');
  }
});

cancelCandidate.addEventListener('click', () => {
  clearCandidate();
  setStatus('登録をやめました。');
});

try {
  repository = new PlaceRepository();
} catch (error) {
  setStatus(error?.message || 'この端末では場所を保存できません', 'error');
}

renderSavedPlaces();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
    setStatus('共有受信の準備に失敗しました。ページを再読み込みしてください。', 'error');
  });
}

readSharedPayloadFromHash();
