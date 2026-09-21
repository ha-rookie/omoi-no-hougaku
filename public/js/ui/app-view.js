import {
  MAX_PLACE_NAME_LENGTH,
  MAX_SAVED_PLACES,
} from '../infrastructure/place-repository.js';

function formatCreatedAt(value) {
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export class AppView {
  constructor(documentRef = document) {
    this.document = documentRef;
    this.status = documentRef.querySelector('#status');
    this.candidatePanel = documentRef.querySelector('#candidate-panel');
    this.candidateSummary = documentRef.querySelector('#candidate-summary');
    this.nameInput = documentRef.querySelector('#place-name');
    this.saveForm = documentRef.querySelector('#save-place-form');
    this.savedCount = documentRef.querySelector('#saved-count');
    this.placeList = documentRef.querySelector('#place-list');
    this.emptyState = documentRef.querySelector('#empty-state');
    this.selectedPanel = documentRef.querySelector('#selected-panel');
    this.selectedName = documentRef.querySelector('#selected-name');
    this.startDirectionButton = documentRef.querySelector('#start-direction');
    this.directionPanel = documentRef.querySelector('#direction-panel');
    this.directionTargetName = documentRef.querySelector('#direction-target-name');
    this.directionStatus = documentRef.querySelector('#direction-status');
    this.directionContent = documentRef.querySelector('#direction-content');
    this.closeDirectionButton = documentRef.querySelector('#close-direction');
    this.directionCompass = documentRef.querySelector('#direction-compass');
    this.compassRotor = documentRef.querySelector('#compass-rotor');
    this.currentHeadingNeedle = documentRef.querySelector('#current-heading-needle');
    this.targetBearingPrimary = documentRef.querySelector('#target-bearing-primary');
    this.targetBearingLabel = documentRef.querySelector('#target-bearing-label');
    this.currentHeadingLabel = documentRef.querySelector('#current-heading-label');
    this.distanceLabel = documentRef.querySelector('#distance-label');
    this.turnInstruction = documentRef.querySelector('#turn-instruction');
    this.compassFallbackNote = documentRef.querySelector('#compass-fallback-note');
    this.modeCompassButton = documentRef.querySelector('#mode-compass');
    this.modeMapButton = documentRef.querySelector('#mode-map');
    this.compassModePanel = documentRef.querySelector('#compass-mode-panel');
    this.mapModePanel = documentRef.querySelector('#map-mode-panel');
    this.mapOverview = documentRef.querySelector('#map-overview');
    this.mapModeLabel = documentRef.querySelector('#map-mode-label');
    this.mapSummary = documentRef.querySelector('#map-summary');

    this.nameInput.maxLength = MAX_PLACE_NAME_LENGTH;
  }

  setStatus(message, type = '') {
    this.status.textContent = message;
    this.status.className = `status ${type}`.trim();
  }

  showCandidate(candidate) {
    this.candidatePanel.hidden = false;
    this.candidateSummary.textContent =
      candidate.sourceType === 'shared-title-coordinate'
        ? '任意ピンの位置を受け取りました。外部APIは使っていません。'
        : 'Google Mapsの共有から場所を確認しました。';
    this.nameInput.value = '';
    this.nameInput.focus();
  }

  hideCandidate() {
    this.candidatePanel.hidden = true;
    this.nameInput.value = '';
  }

  onSave(handler) {
    this.saveForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handler(this.nameInput.value);
    });
  }

  onStartDirection(handler) {
    this.startDirectionButton.addEventListener('click', handler);
  }

  onCloseDirection(handler) {
    this.closeDirectionButton.addEventListener('click', handler);
  }

  onDirectionModeChange(handler) {
    this.modeCompassButton.addEventListener('click', () => handler('compass'));
    this.modeMapButton.addEventListener('click', () => handler('map'));
  }

  renderPlaces(places, { selectedId = null, onSelect, onDelete } = {}) {
    this.savedCount.textContent = `${places.length} / ${MAX_SAVED_PLACES}`;
    this.placeList.replaceChildren();
    this.emptyState.hidden = places.length > 0;

    for (const place of places) {
      const item = this.document.createElement('li');
      item.className = 'place-item';
      item.dataset.selected = String(place.id === selectedId);

      const name = this.document.createElement('div');
      name.className = 'place-name';
      name.textContent = place.name;

      const meta = this.document.createElement('div');
      meta.className = 'place-meta';
      meta.textContent = `登録: ${formatCreatedAt(place.createdAt)}`;

      const actions = this.document.createElement('div');
      actions.className = 'actions';

      const selectButton = this.document.createElement('button');
      selectButton.type = 'button';
      selectButton.textContent = place.id === selectedId ? '選択中' : 'この場所を選ぶ';
      selectButton.addEventListener('click', () => onSelect?.(place.id));

      const deleteButton = this.document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger';
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', () => onDelete?.(place.id));

      actions.append(selectButton, deleteButton);
      item.append(name, meta, actions);
      this.placeList.append(item);
    }
  }

  showSelected(place) {
    if (!place) {
      this.selectedPanel.hidden = true;
      this.selectedName.textContent = '';
      return;
    }

    this.selectedPanel.hidden = false;
    this.selectedName.textContent = place.name;
  }

  showDirectionLoading(place) {
    this.directionPanel.hidden = false;
    this.directionTargetName.textContent = place?.name ?? '目的地';
    this.directionStatus.textContent = '現在地を確認しています…';
    this.directionStatus.className = 'status';
    this.directionContent.hidden = true;
    this.compassFallbackNote.hidden = true;
    this.startDirectionButton.disabled = true;
    this.directionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showDirectionError(message) {
    this.directionPanel.hidden = false;
    this.directionStatus.textContent = message;
    this.directionStatus.className = 'status error';
    this.directionContent.hidden = true;
    this.startDirectionButton.disabled = false;
  }

  renderDirectionSession(session) {
    const bearing = session.targetBearing;
    this.directionContent.hidden = false;
    this.directionStatus.textContent = '方角を確認できます。';
    this.directionStatus.className = 'status ok';
    this.targetBearingPrimary.textContent =
      `目標方位 ${Math.round(bearing)}° ${session.targetDirectionLabel}`;
    this.targetBearingLabel.textContent =
      `${Math.round(bearing)}° ${session.targetDirectionLabel}`;
    this.currentHeadingLabel.textContent = '—';
    this.distanceLabel.textContent = formatDistance(session.distanceMeters);
    this.turnInstruction.textContent = 'コンパスを確認しています…';
    this.setDirectionMode('compass');
    this.resetMapOverview();

    this.compassRotor.style.transform = `rotate(${-bearing}deg)`;
    this.directionCompass.style.setProperty('--compass-counter', `${bearing}deg`);
    this.currentHeadingNeedle.style.transform =
      'translate(-50%, -100%) rotate(0deg)';
    this.startDirectionButton.disabled = false;
  }

  renderDirectionHeading(session) {
    if (!Number.isFinite(session.currentHeading)) return;

    this.currentHeadingLabel.textContent =
      `${Math.round(session.currentHeading)}°`;
    this.turnInstruction.textContent = session.alignment.message;
    this.currentHeadingNeedle.style.transform =
      `translate(-50%, -100%) rotate(${session.relativeAngle ?? 0}deg)`;
    this.directionCompass.dataset.aligned = String(Boolean(session.alignment.aligned));
  }

  setCompassUnavailable(message) {
    this.currentHeadingLabel.textContent = '利用できません';
    this.turnInstruction.textContent = '角度と距離を確認してください。';
    this.compassFallbackNote.hidden = false;
    this.compassFallbackNote.textContent = message;
  }

  setDirectionMode(mode) {
    const isMap = mode === 'map';
    this.modeCompassButton.setAttribute('aria-pressed', String(!isMap));
    this.modeMapButton.setAttribute('aria-pressed', String(isMap));
    this.compassModePanel.hidden = isMap;
    this.mapModePanel.hidden = !isMap;
  }

  getMapOverviewContainer() {
    return this.mapOverview;
  }

  resetMapOverview() {
    this.mapModeLabel.textContent = '地図';
    this.mapSummary.textContent = '';
    this.mapOverview.replaceChildren();
    const loading = this.document.createElement('p');
    loading.className = 'muted';
    loading.textContent = '地図を準備しています…';
    this.mapOverview.append(loading);
  }

  showMapLoading() {
    this.mapModeLabel.textContent = '地図';
    this.mapSummary.textContent = '';
    this.mapOverview.replaceChildren();
    const loading = this.document.createElement('p');
    loading.className = 'muted';
    loading.textContent = '地図を準備しています…';
    this.mapOverview.append(loading);
  }

  showMapReady(result) {
    this.mapModeLabel.textContent =
      result.mode === 'japan' ? '日本地図' : '世界地図';
    this.mapSummary.textContent =
      `${formatDistance(result.distanceMeters)} ・ ${Math.round(result.targetBearing)}° ${result.targetDirectionLabel}`;
  }

  showMapError(message) {
    this.mapModeLabel.textContent = '地図';
    this.mapSummary.textContent = '';
    this.mapOverview.replaceChildren();
    const error = this.document.createElement('p');
    error.className = 'status error';
    error.textContent = message;
    this.mapOverview.append(error);
  }

  hideDirection() {
    this.directionPanel.hidden = true;
    this.directionContent.hidden = true;
    this.directionCompass.dataset.aligned = 'false';
    this.setDirectionMode('compass');
    this.resetMapOverview();
    this.startDirectionButton.disabled = false;
  }
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  if (meters < 100000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}
