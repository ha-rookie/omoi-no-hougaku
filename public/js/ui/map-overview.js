import {
  greatCirclePoints,
  selectMapMode,
  splitMapSeam,
  wrapLongitudeAroundCenter,
} from '../core/map-geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const JAPAN_DATA_URL = '/data/maps/japan-prefectures.geojson';
const WORLD_DATA_URL = '/data/maps/world-110m.geojson';
const WORLD_CENTER_LONGITUDE = 135;
const WORLD_WIDTH = 1440;

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

function projectWorld(point) {
  const longitude = wrapLongitudeAroundCenter(
    point.longitude,
    WORLD_CENTER_LONGITUDE
  );

  return project({
    latitude: point.latitude,
    longitude,
  });
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
  return {
    x: WORLD_CENTER_LONGITUDE * 4,
    y: 28,
    width: WORLD_WIDTH,
    height: 640,
  };
}

function appendMarker(group, point, label, kind, scale, mode) {
  const p = mode === 'world' ? projectWorld(point) : project(point);
  const markerSize = Math.max(scale * 0.012, 0.12);
  const labelOffset = markerSize * 1.8;
  const labelSize = Math.max(scale * 0.025, 0.24);
  const marker = svgElement('g', {
    class: `map-marker map-marker--${kind}`,
    transform: `translate(${p.x} ${p.y})`,
  });

  marker.append(
    svgElement(kind === 'current' ? 'circle' : 'rect', {
      class: 'map-marker-shape',
      ...(kind === 'current'
        ? { cx: 0, cy: 0, r: markerSize }
        : {
            x: -markerSize * 0.88,
            y: -markerSize * 0.88,
            width: markerSize * 1.76,
            height: markerSize * 1.76,
            rx: markerSize * 0.18,
            transform: 'rotate(45)',
          }),
    })
  );

  const text = svgElement('text', {
    x: labelOffset,
    y: -labelOffset * 0.7,
    class: 'map-marker-label',
    'font-size': labelSize,
  });
  text.textContent = label;
  marker.append(text);
  group.append(marker);
}

function appendRelationshipLines(group, current, target, scale, mode) {
  const points = greatCirclePoints(current, target, 64);
  const segments =
    mode === 'world'
      ? splitMapSeam(points, WORLD_CENTER_LONGITUDE)
      : [points];

  for (const segment of segments) {
    const d = segment
      .map((point, index) => {
        const p =
          mode === 'world'
            ? project({ latitude: point.latitude, longitude: point.longitude })
            : project(point);
        return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(' ');

    group.append(
      svgElement('path', {
        d,
        class: 'map-relationship-line',
        'stroke-width': Math.max(scale * 0.003, 0.03),
        'vector-effect': 'non-scaling-stroke',
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
  const scale = Math.max(box.width, box.height);

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

  const geographyPath = buildGeographyPath(geography);
  const geographyAttributes = {
    d: geographyPath,
    class: `map-geography map-geography--${mode}`,
    'fill-rule': 'evenodd',
    'stroke-width': Math.max(scale * 0.0008, 0.01),
    'vector-effect': 'non-scaling-stroke',
  };

  svg.append(svgElement('path', geographyAttributes));
  if (mode === 'world') {
    svg.append(
      svgElement('path', {
        ...geographyAttributes,
        transform: `translate(${WORLD_WIDTH} 0)`,
      })
    );
  }

  const relationshipGroup = svgElement('g', { class: 'map-relationship' });
  appendRelationshipLines(relationshipGroup, current, target, scale, mode);
  appendMarker(relationshipGroup, current, '現在地', 'current', scale, mode);
  appendMarker(
    relationshipGroup,
    target,
    targetName || '目的地',
    'target',
    scale,
    mode
  );
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
