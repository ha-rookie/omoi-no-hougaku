# Third-party notices

## geomagnetism 0.2.0

想いの方角 includes an adapted browser-only subset of `geomagnetism@0.2.0` for WMM2025 magnetic-field calculation.

- Upstream project: `naturalatlas/geomagnetism`
- Upstream version/tag: `v0.2.0`
- License: Apache License 2.0
- License copy: `geomagnetism-0.2.0-LICENSE.txt`
- Modified file: `public/js/vendor/geomagnetism-wmm2025.js`

The adapted file is ported from the implementation already validated in `ha-rookie/yohai-compass`.

## World Magnetic Model 2025

WMM2025 model values and coefficient information are sourced from NOAA NCEI / British Geological Survey materials.

The coefficient asset is stored at:

- `public/data/wmm-2025.json`

The app performs magnetic-declination calculation in the browser and does not send the user's current coordinates to an external geomagnetic API.

Official model page recorded in the coefficient asset:

https://www.ncei.noaa.gov/products/world-magnetic-model
