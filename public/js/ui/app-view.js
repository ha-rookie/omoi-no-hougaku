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
}
