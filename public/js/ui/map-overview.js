import {
  greatCirclePoints,
  selectMapMode,
  splitAntimeridian,
} from '../core/map-geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const JAPAN_DATA_URL = '/data/maps/japan-prefectures.geojson';
const WORLD_DATA_URL = '/data/maps/world-110m.geojson';

let japanDataPromise = null;
let worldDataPromise = null;

async function loadJson(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Map asset could not be loaded: ${response.status}`);
  }
  return response.json();
}

export function loadJapanMapData() {
  japanDataPromise ??= loadJson(JAPAN_DATA_URL).catch((error) => {
    japanDataPromise = null;
    throw error;
  });
  return japanDataPromise;
}

function loadWorldMapData() {
  worldDataPromise ??= loadJson(WORLD_DATA_URL).catch((error) => {
    worldDataPromise = null;
    throw error;
  });
  return worldDataPromise;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function project(point) {
  return {
    x: (point.longitude + 180) * 4,
    y: (90 - point.latitude) * 4,
  };
}

function ringPath(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return '';
  return ring
    .map(([longitude, latitude], index) => {
      const p = project({ longitude, latitude });
      return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    })
    .join(' ') + ' Z';
}

function geometryPath(geometry) {
  if (!geometry) return '';
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map(ringPath).join(' ');
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .flatMap((polygon) => polygon.map(ringPath))
      .join(' ');
  }
  return '';
}

function buildGeographyPath(featureCollection) {
  return featureCollection.features
    .map((feature) => geometryPath(feature.geometry))
    .filter(Boolean)
    .join(' ');
}

function japanViewBox(current, target) {
  const minLat = Math.max(23, Math.min(current.latitude, target.latitude) - 2.4);
  const maxLat = Math.min(46.5, Math.max(current.latitude, target.latitude) + 2.4);
  const minLon = Math.max(122, Math.min(current.longitude, target.longitude) - 3.2);
  const maxLon = Math.min(146.5, Math.max(current.longitude, target.longitude) + 3.2);

  const latSpan = Math.max(maxLat - minLat, 5);
  const lonSpan = Math.max(maxLon - minLon, 6);
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  const west = Math.max(122, centerLon - lonSpan / 2);
  const east = Math.min(146.5, centerLon + lonSpan / 2);
  const south = Math.max(23, centerLat - latSpan / 2);
  const north = Math.min(46.5, centerLat + latSpan / 2);

  const topLeft = project({ latitude: north, longitude: west });
  const bottomRight = project({ latitude: south, longitude: east });

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: Math.max(1, bottomRight.x - topLeft.x),
    height: Math.max(1, bottomRight.y - topLeft.y),
  };
}

function worldViewBox() {
  return { x: 0, y: 28, width: 1440, height: 640 };
}

function appendMarker(group, point, label, kind) {
  const p = project(point);
  const marker = svgElement('g', {
    class: `map-marker map-marker--${kind}`,
    transform: `translate(${p.x} ${p.y})`,
  });

  marker.append(
    svgElement(kind === 'current' ? 'circle' : 'rect', {
      class: 'map-marker-shape',
      ...(kind === 'current'
        ? { cx: 0, cy: 0, r: 8 }
        : { x: -7, y: -7, width: 14, height: 14, rx: 2, transform: 'rotate(45)' }),
    })
  );

  const text = svgElement('text', {
    x: 13,
    y: -11,
    class: 'map-marker-label',
  });
  text.textContent = label;
  marker.append(text);
  group.append(marker);
}

function appendRelationshipLines(group, current, target) {
  const points = greatCirclePoints(current, target, 64);
  const segments = splitAntimeridian(points);

  for (const segment of segments) {
    const d = segment
      .map((point, index) => {
        const p = project(point);
        return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(' ');

    group.append(
      svgElement('path', {
        d,
        class: 'map-relationship-line',
      })
    );
  }
}

function addNorthCue(container) {
  const cue = document.createElement('div');
  cue.className = 'map-north-cue';
  cue.setAttribute('aria-hidden', 'true');
  cue.textContent = '▲\n北';
  container.append(cue);
}

export async function renderMapOverview({
  container,
  current,
  target,
  targetName,
  distanceMeters,
  targetBearing,
  targetDirectionLabel,
  shouldCommit = () => true,
}) {
  if (!container) return null;

  const japanData = await loadJapanMapData();
  const mode = selectMapMode(current, target, japanData);
  const geography = mode === 'japan' ? japanData : await loadWorldMapData();
  const box = mode === 'japan' ? japanViewBox(current, target) : worldViewBox();

  if (!shouldCommit()) {
    return {
      mode,
      distanceMeters,
      targetBearing,
      targetDirectionLabel,
      committed: false,
    };
  }

  container.replaceChildren();
  container.dataset.mapMode = mode;

  const svg = svgElement('svg', {
    class: 'map-overview-svg',
    viewBox: `${box.x} ${box.y} ${box.width} ${box.height}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label':
      mode === 'japan'
        ? '現在地と目的地を示す日本地図'
        : '現在地と目的地を示す世界地図',
  });

  svg.append(
    svgElement('path', {
      d: buildGeographyPath(geography),
      class: `map-geography map-geography--${mode}`,
      'fill-rule': 'evenodd',
    })
  );

  const relationshipGroup = svgElement('g', { class: 'map-relationship' });
  appendRelationshipLines(relationshipGroup, current, target);
  appendMarker(relationshipGroup, current, '現在地', 'current');
  appendMarker(relationshipGroup, target, targetName || '目的地', 'target');
  svg.append(relationshipGroup);

  container.append(svg);
  addNorthCue(container);

  return {
    mode,
    distanceMeters,
    targetBearing,
    targetDirectionLabel,
    committed: true,
  };
}
