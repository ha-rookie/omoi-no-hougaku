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


## Japan prefecture map data

The Japan prefecture GeoJSON used by the Direction Map is derived from:

- Project: `northprint/japan-map-selector`
- Version used as source reference: `0.2.5`
- Project license: MIT
- Original map data: 国土交通省「国土数値情報（行政区域データ）」
- App-side processing: additional coordinate simplification and attribute reduction for mobile delivery
- License copy: `japan-map-selector-LICENSE.txt`
- Attribution copy: `japan-map-selector-ATTRIBUTION.md`

The source project's attribution states that the administrative boundary data originates from the Ministry of Land, Infrastructure, Transport and Tourism's National Land Numerical Information and requires source attribution.

## World map data

The world overview GeoJSON is derived from the `world-atlas` / Natural Earth 110m dataset.

- world-atlas license: ISC (Mike Bostock)
- Natural Earth source data: public domain
- App-side processing: coordinate simplification and property reduction for mobile delivery
- License copy: `world-atlas-LICENSE.txt`

The Direction Map serves both Japan and World map assets from the same origin. It does not send current or target coordinates to an external map provider.
