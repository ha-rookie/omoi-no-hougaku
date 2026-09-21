# ADR-0006: 方角ガイドはYohai Compassの実績ある方位処理を移植し、地図はsame-origin vector mapで国内/海外を切り替える

- Status: Proposed
- Date: 2026-09-22
- Decision Owners: Human
- Related Issue: #51
- Related Design IDs: APP-003 / APP-012 / APP-022 / APP-023 / APP-031 / APP-032 / APP-037 / APP-038

## Context

「想いの方角」は、保存した大切な場所を選び、現在地からその場所がどちらにあるかを理解して実際にその方向を向く体験を中心とする。

既存の「よう拝」(`ha-rookie/yohai-compass`) では、以下がすでに設計・実装・実機確認されている。

- 2地点間の初期方位角と大圏距離
- Browser Geolocation
- Android/iPhone差を吸収したDevice Orientation
- WMM2025による磁気偏角補正
- current headingとtarget bearingの差分評価
- target-up Compass UI
- Compass / Map切替
- current / target markerと接続線を持つMap Overview

一方、「想いの方角」は神社だけではなく、故郷、思い出の場所、墓所、海上の任意地点、海外の場所まで対象とする。

そのため、方位処理の再発明は避けつつ、地図は国内だけでなく海外関係も理解できる必要がある。

## Decision Drivers

- 既にAndroid/iPhone差を検討した「よう拝」の知見を再利用する
- 宗教固有UIは持ち込まず、「想いの方角」向けに一般化する
- 現在地と登録地点を外部Map providerへ送らない
- 国内では日本地図として認識できる詳細さを持たせる
- 海外では世界地図上で位置関係を理解できるようにする
- CompassとMapの切替で権限要求やGeolocation取得をやり直さない
- Google Maps / Mapbox / raster tile providerをMap Overviewのruntime依存にしない

## Options Considered

### Option A: Google Maps等の地図を埋め込む

Pros:

- 詳細な道路・地名・POIを表示できる
- 海外も同一UIで扱いやすい

Cons:

- 現在地・目的地を外部Map providerへ送る設計になりやすい
- API key、利用規約、課金、通信量の追加管理が必要
- 本アプリの用途には道路・POI・経路検索が過剰

### Option B: 国内だけvector map、海外は地図なし

Pros:

- 実装範囲が小さい
- 国内UXは「よう拝」のMap Overviewを流用しやすい

Cons:

- 海外地点を登録できる要件とDirection体験が不整合になる
- 海外だけCompassしか使えず、位置関係を理解しにくい

### Option C: 国内はJapan vector map、海外が含まれる場合はWorld vector map

Pros:

- 外部Map APIへ座標を送らず国内/海外両方を扱える
- 日本国内は都道府県境界等で地域関係を把握しやすい
- 海外は国境・海岸線のoverviewで十分な「位置関係」を示せる
- Static GeoJSONなのでRepositoryでレビュー・固定できる

Cons:

- 世界地図では道路・都市詳細は表示できない
- 日付変更線をまたぐ線描画、great-circle補間が必要
- GeoJSON assetの出典・ライセンス・サイズ管理が必要

## Decision

Option Cを採用する。

### 方位処理

「よう拝」の以下の設計・アルゴリズム・test観点を「想いの方角」へ移植する。

- initial bearing / great-circle distance
- heading normalization
- Device Orientation adapter
- WMM2025 declination calculation
- alignment evaluation
- target-up compass reference frame

別Repositoryをruntime dependencyとしてimportしない。必要な実装をこのRepositoryへ移植し、要件・命名・UIを「想いの方角」向けに調整する。

### Map Overview

Direction画面に `コンパス / 地図` のmode switchを置く。

地図はroute navigationではなく「現在地と目的地の地理的関係」を見るsurfaceとする。

#### Japan mode

現在地と目的地の両方が日本領域内ならJapan mapを使う。

- 日本海岸線
- 都道府県境界
- 現在地marker
- 目的地marker
- 2地点の関係線
- 北
- 距離
- 目標方位

Japan判定はreverse geocodingや外部APIを使わず、same-originの軽量Japan outlineに対するpoint-in-polygonで行う。

#### World mode

現在地または目的地のどちらかが日本領域外ならWorld mapを使う。

- 国境・海岸線中心の軽量World GeoJSON
- 現在地marker
- 目的地marker
- great-circle relationship line
- 北
- 距離
- 目標方位

World mapは道路、POI、衛星画像、turn-by-turn navigationを持たない。

長距離線は緯度経度を単純直線で結ばず、球面上のgreat-circleを複数点へ補間して描く。日付変更線をまたぐ場合はpolylineを分割し、地図の反対側へ不自然な横断線を描かない。

### Data delivery

- Leafletを使う場合はproductionではsame-origin vendor assetにする
- Japan/World GeoJSONもsame-origin static assetにする
- 外部Map tile providerを呼ばない
- dataset source / license / transformation procedureをRepositoryへ記録する

## Rationale

「よう拝」で難しかったのは、方位計算そのものよりもDevice Orientation差異、磁気偏角、reference frame、Map marker anchoringなどの実機依存部分だった。

ここを再発明するより、実績ある境界を移植し、「想いの方角」固有の差分だけを設計する方がリスクが低い。

また、World vector mapを追加しても道路レベルの地図を提供しない限り、runtime Map APIは不要であり、現在地と目的地を外部地図サービスへ送らずに海外対応できる。

## Consequences

Positive:

- 国内/海外で同じDirection体験を提供できる
- 「よう拝」で得た実機知見を再利用できる
- Map表示でGoogle Maps/Mapbox等へ現在地を送信しない
- Map API keyや追加従量課金を持ち込まない
- 日本国内はWorld mapより詳細な地域文脈を見せられる

Negative / Trade-offs:

- World mapは都市・道路レベルの詳細表示をしない
- Japan判定用point-in-polygonが必要
- great-circle / antimeridian処理が必要
- WMM model更新を継続管理する必要がある
- GeoJSON assetの出典・ライセンス確認がProduction gateになる

## Validation

自動test:

- known coordinate pairsのinitial bearing / distance
- heading normalization
- alignment delta
- Japan inside/outside classifier
- great-circle endpoint一致
- antimeridian分割
- Map mode選択
- Map mode切替でGeolocation/Orientation adapterを再起動しない

人間確認:

- Android ChromeでCompassの現在向きが端末回転へ追随
- 日本国内の2地点でJapan mapが表示される
- 日本→海外でWorld mapが表示される
- markerがzoom/panで座標からずれない
- 長距離connection lineが日付変更線で不自然に横断しない

既に「よう拝」で確認済みのアルゴリズム/端末差を機械的に全再テストせず、移植時に変更した境界と「想いの方角」固有UIを重点確認する。

## Revisit Condition

以下の場合は再検討する。

- World mapで道路・都市レベルの詳細表示が必須になった
- same-origin vector assetsのサイズがPWA性能要件を満たさない
- Browser Device Orientation仕様変更で既存heading strategyが成立しなくなった
- WMM2025の有効期間終了により後継modelへの更新が必要になった
