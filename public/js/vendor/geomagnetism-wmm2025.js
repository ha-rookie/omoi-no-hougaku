/*
 * Yohai Compass WMM2025 browser runtime.
 *
 * Adapted from naturalatlas/geomagnetism v0.2.0 (Apache License 2.0),
 * which in turn implements the NOAA World Magnetic Model equations.
 * See public/licenses/geomagnetism-0.2.0-LICENSE.txt and ADR-0002.
 */

const WGS84 = Object.freeze({
  a: 6378.137,
  b: 6356.7523142,
  re: 6371.2,
});

const EPS = Math.sqrt(1 - (WGS84.b * WGS84.b) / (WGS84.a * WGS84.a));
const EPS_SQ = EPS * EPS;

function decimalYear(date) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (end - start);
}

function validateModelData(model) {
  if (!model || model.name !== 'WMM-2025') {
    throw new Error('WMM2025 model data is invalid.');
  }

  const arrays = [
    model.main_field_coeff_g,
    model.main_field_coeff_h,
    model.secular_var_coeff_g,
    model.secular_var_coeff_h,
  ];

  if (arrays.some((value) => !Array.isArray(value))) {
    throw new Error('WMM2025 coefficient arrays are missing.');
  }

  if (!Number.isInteger(model.n_max) || model.n_max < 1) {
    throw new Error('WMM2025 n_max is invalid.');
  }
}

function timedCoefficients(model, year) {
  const dyear = year - model.epoch;
  const g = [];
  const h = [];
  const secMax = model.n_max_sec_var;
  const secularBoundary = secMax * (secMax + 1) / 2 + secMax;

  for (let n = 1; n <= model.n_max; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      const i = n * (n + 1) / 2 + m;
      const gnm = model.main_field_coeff_g[i];
      const hnm = model.main_field_coeff_h[i];
      const dgnm = model.secular_var_coeff_g[i];
      const dhnm = model.secular_var_coeff_h[i];

      if (i <= secularBoundary) {
        g[i] = gnm + dyear * dgnm;
        h[i] = hnm + dyear * dhnm;
      } else {
        g[i] = gnm;
        h[i] = hnm;
      }
    }
  }

  return { g, h };
}

function geodeticToSpherical(latitude, longitude, altitudeKm) {
  const cosLat = Math.cos(latitude * Math.PI / 180);
  const sinLat = Math.sin(latitude * Math.PI / 180);
  const rc = WGS84.a / Math.sqrt(1 - EPS_SQ * sinLat * sinLat);
  const xp = (rc + altitudeKm) * cosLat;
  const zp = (rc * (1 - EPS_SQ) + altitudeKm) * sinLat;
  const r = Math.sqrt(xp * xp + zp * zp);

  return {
    r,
    phig: 180 / Math.PI * Math.asin(zp / r),
    lambda: longitude,
  };
}

function harmonicVariables(spherical, nMax) {
  const cosLambda = Math.cos(Math.PI / 180 * spherical.lambda);
  const sinLambda = Math.sin(Math.PI / 180 * spherical.lambda);
  const cosMlambda = [1.0, cosLambda];
  const sinMlambda = [0.0, sinLambda];
  const relativeRadiusPower = [
    (WGS84.re / spherical.r) * (WGS84.re / spherical.r),
  ];

  for (let n = 1; n <= nMax; n += 1) {
    relativeRadiusPower[n] = relativeRadiusPower[n - 1] * (WGS84.re / spherical.r);
  }

  for (let m = 2; m <= nMax; m += 1) {
    cosMlambda[m] = cosMlambda[m - 1] * cosLambda - sinMlambda[m - 1] * sinLambda;
    sinMlambda[m] = cosMlambda[m - 1] * sinLambda + sinMlambda[m - 1] * cosLambda;
  }

  return { relativeRadiusPower, cosMlambda, sinMlambda };
}

function legendreLow(sinPhi, nMax) {
  const schmidtQuasiNorm = [1.0];
  const pcup = [1.0];
  const dpcup = [0.0];
  const z = Math.sqrt((1 - sinPhi) * (1 + sinPhi));

  for (let n = 1; n <= nMax; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      const i = n * (n + 1) / 2 + m;

      if (n === m) {
        const i1 = (n - 1) * n / 2 + m - 1;
        pcup[i] = z * pcup[i1];
        dpcup[i] = z * dpcup[i1] + sinPhi * pcup[i1];
      } else if (n === 1 && m === 0) {
        const i1 = (n - 1) * n / 2 + m;
        pcup[i] = sinPhi * pcup[i1];
        dpcup[i] = sinPhi * dpcup[i1] - z * pcup[i1];
      } else {
        const i1 = (n - 2) * (n - 1) / 2 + m;
        const i2 = (n - 1) * n / 2 + m;

        if (m > n - 2) {
          pcup[i] = sinPhi * pcup[i2];
          dpcup[i] = sinPhi * dpcup[i2] - z * pcup[i2];
        } else {
          const k = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
          pcup[i] = sinPhi * pcup[i2] - k * pcup[i1];
          dpcup[i] = sinPhi * dpcup[i2] - z * pcup[i2] - k * dpcup[i1];
        }
      }
    }
  }

  for (let n = 1; n <= nMax; n += 1) {
    let i = n * (n + 1) / 2;
    let i1 = (n - 1) * n / 2;
    schmidtQuasiNorm[i] = schmidtQuasiNorm[i1] * (2 * n - 1) / n;

    for (let m = 1; m <= n; m += 1) {
      i = n * (n + 1) / 2 + m;
      i1 = i - 1;
      schmidtQuasiNorm[i] = schmidtQuasiNorm[i1]
        * Math.sqrt(((n - m + 1) * (m === 1 ? 2 : 1)) / (n + m));
    }
  }

  for (let n = 1; n <= nMax; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      const i = n * (n + 1) / 2 + m;
      pcup[i] *= schmidtQuasiNorm[i];
      dpcup[i] *= -schmidtQuasiNorm[i];
    }
  }

  return { pcup, dpcup };
}

function summation(model, coefficients, spherical, legendre, harmonics) {
  let bx = 0;
  let by = 0;
  let bz = 0;

  for (let n = 1; n <= model.n_max; n += 1) {
    for (let m = 0; m <= n; m += 1) {
      const i = n * (n + 1) / 2 + m;
      const common = coefficients.g[i] * harmonics.cosMlambda[m]
        + coefficients.h[i] * harmonics.sinMlambda[m];

      bz -= harmonics.relativeRadiusPower[n] * common * (n + 1) * legendre.pcup[i];
      by += harmonics.relativeRadiusPower[n]
        * (coefficients.g[i] * harmonics.sinMlambda[m]
          - coefficients.h[i] * harmonics.cosMlambda[m])
        * m
        * legendre.pcup[i];
      bx -= harmonics.relativeRadiusPower[n] * common * legendre.dpcup[i];
    }
  }

  const cosPhi = Math.cos(Math.PI / 180 * spherical.phig);
  if (Math.abs(cosPhi) > 1e-10) {
    by /= cosPhi;
  } else {
    by = 0;
    let schmidt1 = 1.0;
    const pcupS = [1];
    const sinPhi = Math.sin(Math.PI / 180 * spherical.phig);

    for (let n = 1; n <= model.n_max; n += 1) {
      const i = n * (n + 1) / 2 + 1;
      const schmidt2 = schmidt1 * (2 * n - 1) / n;
      const schmidt3 = schmidt2 * Math.sqrt(2 * n / (n + 1));
      schmidt1 = schmidt2;

      if (n === 1) {
        pcupS[n] = pcupS[n - 1];
      } else {
        const k = ((n - 1) * (n - 1) - 1) / ((2 * n - 1) * (2 * n - 3));
        pcupS[n] = sinPhi * pcupS[n - 1] - k * pcupS[n - 2];
      }

      by += harmonics.relativeRadiusPower[n]
        * (coefficients.g[i] * harmonics.sinMlambda[1]
          - coefficients.h[i] * harmonics.cosMlambda[1])
        * pcupS[n]
        * schmidt3;
    }
  }

  return { bx, by, bz };
}

function rotateToGeodetic(vector, spherical, geodeticLatitude) {
  const psi = Math.PI / 180 * (spherical.phig - geodeticLatitude);
  return {
    bz: vector.bx * Math.sin(psi) + vector.bz * Math.cos(psi),
    bx: vector.bx * Math.cos(psi) - vector.bz * Math.sin(psi),
    by: vector.by,
  };
}

function magneticElements(vector) {
  const h = Math.sqrt(vector.bx * vector.bx + vector.by * vector.by);
  return {
    x: vector.bx,
    y: vector.by,
    z: vector.bz,
    h,
    f: Math.sqrt(h * h + vector.bz * vector.bz),
    decl: 180 / Math.PI * Math.atan2(vector.by, vector.bx),
    incl: 180 / Math.PI * Math.atan2(vector.bz, h),
  };
}

export function computeWmm2025(model, latitude, longitude, date = new Date(), altitudeKm = 0) {
  validateModelData(model);

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('WMM2025 requires a valid Date.');
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError('WMM2025 latitude is out of range.');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError('WMM2025 longitude is out of range.');
  }
  if (!Number.isFinite(altitudeKm)) {
    throw new TypeError('WMM2025 altitude must be finite.');
  }

  const year = decimalYear(date);
  const validFrom = Number(model.valid_from_decimal_year ?? 2025.0);
  const validToExclusive = Number(model.valid_to_decimal_year_exclusive ?? 2030.0);

  if (year < validFrom || year >= validToExclusive) {
    const error = new RangeError(`WMM2025 is valid for ${validFrom} <= decimal year < ${validToExclusive}.`);
    error.code = 'out_of_model_range';
    throw error;
  }

  const spherical = geodeticToSpherical(latitude, longitude, altitudeKm);
  const harmonics = harmonicVariables(spherical, model.n_max);
  const legendre = legendreLow(
    Math.sin(Math.PI / 180 * spherical.phig),
    model.n_max,
  );
  const coefficients = timedCoefficients(model, year);
  const sphericalVector = summation(model, coefficients, spherical, legendre, harmonics);
  const vector = rotateToGeodetic(sphericalVector, spherical, latitude);
  const elements = magneticElements(vector);

  if (!Number.isFinite(elements.decl)) {
    throw new Error('WMM2025 produced a non-finite declination.');
  }

  return {
    ...elements,
    decimalYear: year,
    model: model.name,
  };
}
