const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function normalizeLongitude(value) {
  if (!Number.isFinite(value)) return null;
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function validPoint(point) {
  return Boolean(
    point &&
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      point.longitude >= -180 &&
      point.longitude <= 180
  );
}

function pointOnSegment(x, y, ax, ay, bx, by, epsilon = 1e-9) {
  const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
  if (Math.abs(cross) > epsilon) return false;
  const lengthSq = (bx - ax) ** 2 + (by - ay) ** 2;
  if (lengthSq <= epsilon) {
    return (x - ax) ** 2 + (y - ay) ** 2 <= epsilon ** 2;
  }

  const dot = (x - ax) * (bx - ax) + (y - ay) * (by - ay);
  if (dot < -epsilon) return false;
  return dot <= lengthSq + epsilon;
}

function pointInRing(longitude, latitude, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    if (pointOnSegment(longitude, latitude, xi, yi, xj, yj)) {
      return true;
    }

    const intersects =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(point, coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
  if (!pointInRing(point.longitude, point.latitude, coordinates[0])) return false;

  for (let i = 1; i < coordinates.length; i += 1) {
    if (pointInRing(point.longitude, point.latitude, coordinates[i])) {
      return false;
    }
  }

  return true;
}

export function pointInGeometry(point, geometry) {
  if (!validPoint(point) || !geometry) return false;

  if (geometry.type === 'Polygon') {
    return pointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }

  return false;
}

export function pointInFeatureCollection(point, featureCollection) {
  if (!validPoint(point) || !Array.isArray(featureCollection?.features)) {
    return false;
  }

  return featureCollection.features.some((feature) =>
    pointInGeometry(point, feature.geometry)
  );
}

export function selectMapMode(current, target, japanFeatureCollection) {
  if (!validPoint(current) || !validPoint(target)) {
    throw new TypeError('Map mode requires valid current and target coordinates');
  }

  return pointInFeatureCollection(current, japanFeatureCollection) &&
    pointInFeatureCollection(target, japanFeatureCollection)
    ? 'japan'
    : 'world';
}

function toVector(point) {
  const lat = point.latitude * DEG_TO_RAD;
  const lon = point.longitude * DEG_TO_RAD;
  const cosLat = Math.cos(lat);
  return [
    cosLat * Math.cos(lon),
    cosLat * Math.sin(lon),
    Math.sin(lat),
  ];
}

function fromVector(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  const x = vector[0] / length;
  const y = vector[1] / length;
  const z = vector[2] / length;
  return {
    latitude: Math.atan2(z, Math.hypot(x, y)) * RAD_TO_DEG,
    longitude: normalizeLongitude(Math.atan2(y, x) * RAD_TO_DEG),
  };
}

export function greatCirclePoints(start, end, segments = 48) {
  if (!validPoint(start) || !validPoint(end)) {
    throw new TypeError('Great-circle path requires valid coordinates');
  }

  const count = Math.max(2, Math.min(256, Math.round(segments)));
  const a = toVector(start);
  const b = toVector(end);
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);

  if (omega < 1e-10) {
    return [
      { latitude: start.latitude, longitude: start.longitude },
      { latitude: end.latitude, longitude: end.longitude },
    ];
  }

  const sinOmega = Math.sin(omega);
  if (Math.abs(sinOmega) < 1e-10) {
    return Array.from({ length: count + 1 }, (_, index) => {
      const t = index / count;
      return {
        latitude: start.latitude + (end.latitude - start.latitude) * t,
        longitude:
          normalizeLongitude(
            start.longitude +
              (((end.longitude - start.longitude + 540) % 360) - 180) * t
          ) ?? start.longitude,
      };
    });
  }

  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    const wa = Math.sin((1 - t) * omega) / sinOmega;
    const wb = Math.sin(t * omega) / sinOmega;
    return fromVector([
      wa * a[0] + wb * b[0],
      wa * a[1] + wb * b[1],
      wa * a[2] + wb * b[2],
    ]);
  });
}

export function splitAntimeridian(points) {
  if (!Array.isArray(points) || points.length === 0) return [];

  const segments = [[{ ...points[0], longitude: normalizeLongitude(points[0].longitude) }]];

  for (let i = 1; i < points.length; i += 1) {
    const previous = segments[segments.length - 1][segments[segments.length - 1].length - 1];
    const current = {
      ...points[i],
      longitude: normalizeLongitude(points[i].longitude),
    };

    let adjustedLon = current.longitude;
    const diff = adjustedLon - previous.longitude;

    if (diff > 180) adjustedLon -= 360;
    if (diff < -180) adjustedLon += 360;

    if (adjustedLon > 180 || adjustedLon < -180) {
      const boundary = adjustedLon > 180 ? 180 : -180;
      const denominator = adjustedLon - previous.longitude;
      const t = denominator === 0 ? 0 : (boundary - previous.longitude) / denominator;
      const crossingLatitude =
        previous.latitude + (current.latitude - previous.latitude) * t;

      segments[segments.length - 1].push({
        latitude: crossingLatitude,
        longitude: boundary,
      });

      const wrappedBoundary = boundary === 180 ? -180 : 180;
      segments.push([
        {
          latitude: crossingLatitude,
          longitude: wrappedBoundary,
        },
        current,
      ]);
    } else {
      segments[segments.length - 1].push(current);
    }
  }

  return segments.filter((segment) => segment.length >= 2);
}
