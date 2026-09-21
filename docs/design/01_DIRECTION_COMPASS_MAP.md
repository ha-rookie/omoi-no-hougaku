# Direction / Compass / Map Design

Status: Proposed  
Related Issue: #51  
Related ADR: ADR-0006  
Reference implementation: `ha-rookie/yohai-compass`

## 1. Purpose

保存した場所を選んだ後に、ユーザーが次の2つを理解できることを目的とする。

1. **どちらを向けばよいか**
2. **現在地と目的地が地理的にどう離れているか**

そのためDirection画面を、同じGuidance Sessionを共有する2つの表示へ分ける。

- コンパス: 端末をどちらへ向けるか
- 地図: 現在地と目的地の位置関係

## 2. Reuse from Yohai Compass

### そのまま考え方を引き継ぐ

- `bearing-engine.js`
  - initial bearing
  - great-circle distance
- `heading-normalizer.js`
  - 0-360 normalization
  - shortest angle difference
  - cardinal direction
- `heading-provider.js`
  - `webkitCompassHeading`
  - `deviceorientationabsolute`
  - absolute alpha
  - Android/iPhone差
- `declination-provider.js`
  - WMM2025
  - same-origin coefficient/runtime
  - fail closed
- `alignment-engine.js`
  - left / right / aligned
- Compass Reference Frame
  - target markerは上端固定
  - 方位盤はtarget bearing基準で固定
  - 動く主要要素はcurrent heading
- Map Overview
  - Compass / Map切替
  - north-up
  - current / target marker
  - relationship line
  - map切替でpermissionを再要求しない

### そのまま持ち込まない

- 鳥居・神社・遥拝という名称
- 朱/金/若草を前提とした宗教的Visual Language
- Shrine marker semantics
- 日本国内だけを前提としたviewport

## 3. Guidance Session

Direction画面を開いた時に1つのruntime sessionを作る。

```text
SavedPlace
   +
Geolocation
   ↓
Guidance Session
├─ currentPosition
├─ targetPosition
├─ targetBearing
├─ distanceMeters
├─ currentHeading
├─ relativeAngle
└─ alignmentState
      ↓
  ┌───────────┬───────────┐
  │ Compass   │ Map       │
  └───────────┴───────────┘
```

Compass / Mapを切り替えてもGuidance Sessionを作り直さない。

禁止:

- mode切替ごとにGeolocationを再取得
- mode切替ごとにOrientation permissionを再要求
- currentPositionをlocalStorageへ保存
- Map表示のためにcurrentPositionを外部APIへ送る

## 4. Compass

### 4.1 Reference frame

```text
screen top = target
target marker = fixed
compass dial = rotate(-targetBearing) and stay fixed
current-heading needle = rotate(currentHeading - targetBearing)
```

ユーザーが端末を回すとcurrent-heading needleだけが大きく動く。

### 4.2 表示

最低限表示する。

- 選択地点名
- 目標方位: 例 `241° 南西`
- 距離
- 左右誘導: 例 `右へ約18°`
- alignment
- 北 / 東 / 南 / 西

色だけで状態を表さない。

### 4.3 Sensor fallback

Orientationが取得できなくても、

- 目標方位
- 方位名
- 距離
- Map

は利用可能にする。

「コンパスが使えない = Direction画面全体が使えない」にはしない。

## 5. Map mode selection

### 5.1 Japan判定

Map providerへreverse geocodingしない。

same-originの軽量Japan outlineを使い、current/targetの両点がJapan polygon内かpoint-in-polygonで判定する。

```text
current in Japan AND target in Japan
    -> Japan Map
otherwise
    -> World Map
```

単純な緯度経度bounding boxだけでは、韓国・ロシア・台湾周辺を誤ってJapan扱いする可能性があるため採用しない。

### 5.2 Japan Map

目的:

- 「名古屋から愛媛」
- 「北海道から沖縄」
- 「東京から伊勢」

のような国内関係を、世界地図より具体的に理解する。

表示:

- 海岸線
- 都道府県境界
- 現在地marker + label
- 目的地marker + user-defined name
- relationship line
- north indicator
- target bearing
- distance

道路/店舗/路線/ルート検索は表示しない。

### 5.3 World Map

目的:

- 日本→ハワイ
- 日本→ヨーロッパ
- 海外→日本
- 海外→海外

の位置関係をoverviewとして理解する。

表示:

- 国境・海岸線
- 現在地marker
- 目的地marker
- great-circle relationship line
- north indicator
- target bearing
- distance

都市道路レベルの詳細はMVP対象外。

## 6. Great-circle line

World Mapでは単純な `[current, target]` polylineを使わない。

sphere上でslerp相当の補間を行い、例えば32〜64点程度のgeodesic pointsを生成する。

### 6.1 Antimeridian

経度差が180°を跨ぐsegmentは分割する。

目的:

- ハワイ/北米方向で世界地図を横断する不自然な線を防ぐ
- viewport fitが世界全体へ引っ張られすぎるのを防ぐ

### 6.2 Compassとの意味の違い

CompassのtargetBearingは**現在地から出発する瞬間のinitial bearing**。

World Mapのgreat-circle lineは地球上の関係を可視化するoverview。

長距離ではgreat-circleに沿って進むとbearing自体は変化するが、本アプリはnavigationをしないため問題としない。

## 7. Data assets

Productionはsame-originを原則とする。

候補構成:

```text
public/
├─ data/maps/
│  ├─ japan-outline.geojson
│  ├─ japan-prefectures.geojson
│  └─ world-110m.geojson
├─ js/vendor/
│  └─ leaflet/
└─ licenses/
```

### Japan data

必要:

- Japan判定用の軽量outline
- UI表示用のprefecture-level geometry

Production採用前にsource / license / attributionを確認し、Repositoryへ記録する。

### World data

必要:

- 国境・海岸線
- 軽量化されたlow-resolution geometry

Natural Earth等のstatic geographyを候補とし、Production採用時にsource/licenseを記録する。

## 8. Viewport

### Japan Map

2点をtight fitしすぎず、周囲の地理文脈を残す。

Yohai CompassのMap Overviewで得た以下の知見を引き継ぐ。

- 最小regional spanを持たせる
- coastline / prefecture boundaryが見えるzoomにする
- marker label幅でgeographic anchorをずらさない

### World Map

- 2点を含む
- great-circle lineの主要部分を含む
- antimeridianをまたぐ場合はwrapped representationを選ぶ
- world全体が不要な場合は必要範囲へfit
- current/targetが近接する場合はbounded fallback zoom

## 9. Privacy

Map表示だけではNetworkへ座標を送らない。

- currentPosition: runtime memory only
- targetPosition: localStorageから読み込み
- Japan/World GeoJSON: same-origin static asset
- Leaflet: same-origin vendor
- no raster tiles
- no Google Maps JS API
- no Mapbox
- no reverse geocoding
- no coordinate-bearing analytics event

## 10. Error / fallback

### Geolocation failure

Compass / Mapを開始せず、permission / unavailable / timeoutを区別して表示する。

### Heading failure

Mapとtarget bearing/distanceは継続利用可能。
Compass live needleのみfallback表示にする。

### Japan detailed map failure

外部tileへfallbackしない。

- local Japan outlineが使えるなら簡易Japan Map
- それも不可ならWorld Map
- それも不可ならtext-only bearing/distance

### World map failure

Compass / text guidanceを継続し、外部Map providerへ自動fallbackしない。

## 11. Human test policy

Yohai Compassで既に確認した事項は「移植しただけ」なら再度大量実機テストしない。

自動testで同一性を守り、人間は以下を重点確認する。

- 想いの方角固有のCompass UI
- 保存地点選択→Direction遷移
- Japan / World map自動切替
- marker/label
- antimeridian表示
- mode switch
- 新しいprivacy boundary

Androidでまず確認し、iPhone固有permission flowはheading adapterを変更した場合に重点確認する。

## 12. Acceptance

- 保存地点からDirectionを開ける
- Geolocationは1 guidance sessionにつき必要時に取得
- bearing/distanceが表示される
- live headingが利用可能な端末ではcurrent-heading indicatorが追随
- Compass / Map切替がある
- 国内2点ではJapan Map
- 海外を含む場合はWorld Map
- map切替でpermissionを再要求しない
- Mapでcurrent/target座標を外部providerへ送信しない
- World Mapのconnectionがgreat-circle
- antimeridianで不自然な横断線を描かない
- headingが使えなくてもMapとbearing/distanceは使える
