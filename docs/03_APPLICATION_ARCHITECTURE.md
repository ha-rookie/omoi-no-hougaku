# Application Architecture

## 1. 文書目的

この文書は、アプリ内部の論理構成、Module責務、依存関係、状態、データ処理、エラー境界の正本とする。

システム外部との配置関係は `02_SYSTEM_ARCHITECTURE.md`、物理ファイル配置は `04_REPOSITORY_STRUCTURE.md` に分離する。

## 2. Logical Architecture

```text
Presentation / UI
  - Place List
  - Add/Confirm Place
  - Direction View
  - Compass View
  - Map Overview
  - Permission / Error UI
      |
      v
Application / Use Cases
  - Receive Shared Place
  - Register Place
  - Select Place
  - Delete Place
  - Show Direction
      |
      v
Domain / Core Logic
  - Shared Payload Classification
  - Coordinate Validation
  - Bearing / Distance Calculation
  - Direction Naming
  - Heading Normalization / Alignment
  - Japan / World Map Classification
  - Great-circle Path Construction
  - Saved-place Limit Rule
      |
      v
Infrastructure
  - Web Share Target / Service Worker
  - localStorage
  - Geolocation
  - Device Orientation
  - WMM2025 same-origin runtime/data
  - Same-origin Japan/World map assets
  - Same-origin Location Resolver Client
      |
      v
Cloudflare Pages Function
  - /api/resolve-location
  - Rate Limiter Service Binding client
  - Maps Grounding Lite client
  - Places API (New) client
      |
      v
Private Cloudflare Worker
  - Rate Limiting binding
```

Domain/CoreはDOM、Cloudflare、Google APIに依存させない。

## 3. Component Responsibilities

| ID | Component | Responsibility | Inputs | Outputs | Must Not Do |
| --- | --- | --- | --- | --- | --- |
| APP-001 | PlaceListUI | 保存地点の一覧・選択・削除操作 | SavedPlace[] | User action | 方位角計算を持たない |
| APP-002 | AddPlaceUI | 共有地点の確認、表示名入力、保存確認 | PlaceCandidate | Register request | API呼び出しロジックを抱え込まない |
| APP-003 | DirectionUI | 目的地方向を文字・角度・視覚要素で表示 | DirectionState | Rendered UI | センサー値取得を直接持たない |
| APP-004 | ShareReceiveUI | 共有受信後の解決状態・失敗を表示 | SharePayload / result | UI state | 座標を推測しない |
| APP-010 | ReceiveSharedPlaceUseCase | 共有payloadを分類し地点候補を確定する | SharePayload | PlaceCandidate/Error | DOM操作・保存をしない |
| APP-011 | RegisterPlaceUseCase | 表示名検証、最大5件ルール、保存 | PlaceCandidate + name | SavedPlace | Network送信しない |
| APP-012 | ShowDirectionUseCase | 現在地と目的地から方向状態を組み立てる | SavedPlace | DirectionState | localStorage形式へ依存しない |
| APP-020 | SharedPayloadClassifier | `title/text/url`を座標またはGoogle Maps URLへ分類 | SharePayload | CoordinateInput / MapsUrl / Unsupported | APIを呼ばない |
| APP-021 | CoordinateValidator | 緯度経度を検証する | lat/lng | Valid/Invalid | 推測座標を生成しない |
| APP-022 | BearingCalculator | 2地点間の初期方位角を計算する | from/to coordinates | degrees 0-360 | DOM/センサーへ依存しない |
| APP-023 | DirectionLabeler | 角度を北/北東等の表現へ変換する | degrees | label | 位置情報を保存しない |
| APP-030 | PlaceRepository | SavedPlaceのlocalStorage読み書き | SavedPlace | SavedPlace[] | Network送信しない |
| APP-031 | GeolocationAdapter | Browser Geolocationを抽象化する | permission/request | CurrentPosition | 目的地を扱わない |
| APP-032 | OrientationAdapter | Device Orientationを抽象化する | permission/events | heading | 方位角計算をしない |
| APP-033 | ShareTargetAdapter | Web Share Target POSTをService Workerで受け、一時payloadとしてAppへ渡す | form POST | SharePayload | DB保存・外部送信・query埋込をしない |
| APP-034 | LocationResolverClient | 同一origin `/api/resolve-location` を呼ぶ | maps.app.goo.gl URL | PlaceCandidate/Error | API keyを保持しない |
| APP-035 | ServerLocationResolver | Maps URL→Place ID→座標を公式APIで解決する | short Maps URL | coordinates/placeId | 汎用proxy化・DB保存・入力loggingをしない |
| APP-036 | RateLimitGateway | Service binding経由でGoogle API前段のRate Limitを判定する | resource key | allowed / limited | 地点情報・共有URLをRate Limit keyへ含めない |
| APP-037 | MapModeClassifier | current/targetが日本領域内か判定しJapan/World Mapを選ぶ | current/target + Japan outline | japan/world | reverse geocoding・外部APIを呼ばない |
| APP-038 | MapOverviewUI | current/target/北/距離/方位をvector map上へ表示する | GuidanceSession + map mode | Rendered map | Geolocationを再取得しない |
| APP-039 | GeodesicPathBuilder | World Map用great-circle lineを生成しantimeridianで分割する | from/to coordinates | polyline segments | routing/道路情報を扱わない |
| APP-040 | DeclinationProvider | WMM modelで磁気偏角を端末内計算する | current coordinates + date | declination degrees | 外部geomagnetic APIへ現在地を送らない |

## 4. Dependency Rules

- UIからGoogle APIを直接呼ばず、外部I/OはAdapter/Clientへ分離する
- 任意ピン判定はDomain/Coreで完結し、外部APIを呼ばない
- Domain/CoreがDOMやCloudflareへ依存するか: No
- InfrastructureがUI状態を持つか: No
- Module間の循環依存: 禁止
- localStorage schema: PlaceRepositoryのみに閉じ込める
- Service Workerは共有受信に限定し、地点保存のSource of Truthにしない
- Pages FunctionはSavedPlace model/localStorageへ依存しない
- Google API keyはServer側環境変数/Secret以外へ置かない
- Compass / Mapは同じGuidance Sessionを共有し、view切替でGeolocation/Orientationを再起動しない
- Direction Mapはsame-origin vector assetsを使い、current/target座標を外部Map providerへ送らない
- World Map connectionはGreat-circle Path Builderを経由し、antimeridianを明示処理する

## 5. Routing / Screen Composition

MVPは単一PWA内の状態遷移を基本とする。

| ID | Route/Screen | Purpose | Entry | Main Actions | Exit |
| --- | --- | --- | --- | --- | --- |
| UI-001 | Home / Place List | 保存済みの大切な場所を選ぶ | App start | 選択、追加、削除 | Direction / Add guide |
| UI-002 | Add / Confirm Place | Google Maps共有から得た地点を確認・命名・保存 | Share Target | 確認、命名、保存、キャンセル | Home / Direction |
| UI-003 | Direction | 選択地点の方角を向き、地理的関係も確認する | Place selected | 位置許可、コンパス/地図切替、方角確認 | Home |
| UI-004 | Permission/Error State | 必要な許可・失敗理由を伝える | Runtime failure | 再試行、設定確認、戻る | Previous screen |
| UI-005 | Add Guide | Google Mapsで地点を開き共有する手順を案内 | Home add action | Google Mapsを開く | External Google Maps |

画面の視覚詳細は `design/` を正本とする。

## 6. State Management

| State | Scope | Source of Truth | Persistence | Reset Condition |
| --- | --- | --- | --- | --- |
| savedPlaces | App | PlaceRepository | localStorage | User delete / storage clear / schema migration |
| selectedPlaceId | UI/App | Runtime state | none | Home return / reload |
| currentPosition | Runtime | GeolocationAdapter | none | Reload / new request |
| deviceHeading | Runtime | OrientationAdapter | none | Reload / sensor stop |
| addPlaceDraft | UI | Form state | none | Save / cancel / reload |
| sharedPayload | Runtime | ShareTargetAdapter | none | Resolution complete / cancel / reload |
| permissionState | Runtime | Browser APIs | none | Browser/OS permission change |
| guidanceSession | Runtime | ShowDirectionUseCase | none | Home return / reload / selected place change |
| directionViewMode | UI | User selection | none | Direction exit |
| mapMode | Runtime | MapModeClassifier | none | Guidance session reset |

Pages FunctionはApplication stateを持たず、共有URL・Place ID・座標を永続化しない。

## 7. Runtime Sequence

### 7.1 Direction表示

```text
User selects saved place
  -> ShowDirectionUseCase
  -> GeolocationAdapter.getCurrentPosition()
  -> BearingCalculator.calculate(current, target)
  -> DistanceCalculator.calculate(current, target)
  -> DirectionLabeler.label(bearing)
  -> MapModeClassifier(current, target)
  -> GuidanceSession create
  -> OrientationAdapter.start() when supported/allowed
  -> DeclinationProvider when true-north correction is required
  -> DirectionUI render
       |-> Compass View
       |-> Map Overview (same GuidanceSession)
```

### 7.2 Place登録: 共通入口

```text
Google Maps -> Share -> 想いの方角
  -> ShareTargetAdapter receives POST
  -> SharePayloadClassifier.classify(title,text,url)
```

#### 任意ピン

```text
classified as strict coordinate title
  -> CoordinateValidator
  -> PlaceCandidate(method=shared-title-coordinate)
  -> AddPlaceUI confirm + name
  -> RegisterPlaceUseCase
  -> PlaceRepository.save()
```

任意ピンでは`LocationResolverClient`を呼ばない。

#### 名称付き施設

```text
classified as maps URL
  -> LocationResolverClient POST /api/resolve-location
  -> ServerLocationResolver
       -> RateLimitGateway check(resolve-location)
       -> limitedなら429で終了
       -> Maps Grounding Lite ResolveMapsUrls
       -> Place ID
       -> Places API (New) Place Details (id/location only)
  -> CoordinateValidator
  -> PlaceCandidate(method=maps-url-api)
  -> AddPlaceUI confirm + name
  -> RegisterPlaceUseCase
  -> PlaceRepository.save()
```

## 8. Data Model

| ID | Model | Key Fields | Owner | Validation | Persistence |
| --- | --- | --- | --- | --- | --- |
| DATA-001 | SavedPlace | id, name, latitude, longitude, createdAt | PlaceRepository | name length, lat/lng range, count <= 5 | localStorage |
| DATA-002 | StorageEnvelope | schemaVersion, places | PlaceRepository | schemaVersion, array shape | localStorage |
| DATA-003 | PlaceCandidate | latitude, longitude, sourceType, optional displayHint | ReceiveSharedPlaceUseCase | lat/lng range | none until confirmed |
| DATA-004 | DirectionState | targetBearing, directionLabel, deviceHeading?, relativeAngle? | ShowDirectionUseCase | degree normalization | none |
| DATA-005 | SharePayload | title?, text?, url? | ShareTargetAdapter | string length/type | none |
| DATA-006 | ResolveLocationRequest | url | LocationResolverClient / ServerLocationResolver | HTTPS, exact short host, length | none |
| DATA-007 | ResolveLocationResponse | ok, latitude?, longitude?, placeId?, error? | ServerLocationResolver | no input URL echo | none |
| DATA-008 | GuidanceSession | selectedPlaceId, currentPosition, targetPosition, targetBearing, distanceMeters, currentHeading?, relativeAngle?, alignmentState? | ShowDirectionUseCase | coordinates/degree normalization | none |
| DATA-009 | MapOverviewState | mode, current, target, relationshipSegments | MapOverviewUI | japan/world + valid coordinates | none |

MVPでは住所全文、Google検索履歴、人物属性、共有URL、Place IDをlocalStorageへ保存しない。

## 9. Interfaces

| ID | Interface | Direction | Request/Input | Response/Output | Error Contract |
| --- | --- | --- | --- | --- | --- |
| IF-001 | PlaceRepository | Internal | CRUD request | SavedPlace[] | StorageUnavailable / CorruptData / LimitExceeded |
| IF-002 | Browser Geolocation | Out | current-position request | coordinates | PermissionDenied / Unavailable / Timeout |
| IF-003 | Device Orientation | Out | permission/start | heading events | Unsupported / PermissionDenied |
| IF-004 | Google Maps external link | Out | open/search | Google Maps app/site | OpenFailed |
| IF-005 | Web Share Target | External -> PWA | POST title/text/url | SharePayload | Unsupported / SWNotReady |
| IF-006 | SharedPayloadClassifier | Internal | SharePayload | CoordinateInput / MapsUrl | UnsupportedFormat / InvalidCoordinates |
| IF-007 | `POST /api/resolve-location` | Client -> same-origin Pages Function | `{ "url": "https://maps.app.goo.gl/..." }` | `{ ok, latitude, longitude, placeId }` | 4xx input/security, 5xx Google API/upstream |
| IF-008 | Maps Grounding Lite | Server -> Google | Maps URL | Place ID | Google API error / no unique place |
| IF-009 | Places API (New) | Server -> Google | Place ID + fields=id,location | id/location | Google API error / missing location |
| IF-010 | Rate Limiter Service | Pages Function -> private Worker | resource key=`resolve-location` | allowed / limited | 429 / 503 |
| IF-011 | Same-origin Map Assets | PWA -> same-origin static assets | Japan outline/prefectures/World GeoJSON | vector geography | AssetUnavailable |
| IF-012 | Same-origin WMM Model | PWA -> same-origin static assets | model coefficients/runtime | declination calculation input | ModelUnavailable / OutOfValidity |

`IF-007` responseへ入力URL・地点名を含めない。Place IDは登録後に永続保存しない。

## 10. Error Handling

- 共有titleが座標形式だが範囲外: 保存せずInvalidCoordinates
- 共有内容からGoogle Maps URLを抽出できない: UnsupportedFormat
- Google API解決失敗: 推測せず「場所を読み取れませんでした」
- API key/Server error: 新規施設登録だけ失敗させ、保存済み地点機能へ波及させない
- Geolocation失敗: 方角計算を行わずpermission/unavailable/timeoutを区別する
- Orientation失敗: コンパス追従なしで方位角・方向名・地図へ縮退する
- Japan detailed map失敗: same-origin Japan outline、次にWorld Mapへ縮退し、外部tile providerへ自動fallbackしない
- World Map失敗: text/Compass guidanceは継続し、外部Map providerへ自動fallbackしない
- Storage失敗: 保存できないことを明示し、成功表示しない
- 保存件数超過: 既存地点を自動上書きせず、削除を促す

## 11. PWA / Offline

- PWA採用: MVPで採用
- Web Share Target: Android Google Mapsからの地点登録主導線として採用
- Google Mapsの共有先として利用するにはPWAインストールが前提のため、未インストール時はAdd Guide内でその理由と追加方法を案内する
- Android/Chromiumでは `beforeinstallprompt` を捕捉し、Install CTAからnative promptを起動する
- `display-mode: standalone` またはiOS standalone時はInstall UIを表示しない
- `beforeinstallprompt` 非対応環境ではブラウザメニュー/ホーム画面追加のmanual guidanceへ縮退する
- ManifestはChromium installability向けに192x192 / 512x512 icon descriptorを持つ。Approved `app-icon.svg` のvisual designは変更しない
- Service Worker: share target POST受信とApp shellの必要最小処理を担当
- Share Target POSTはService Workerで受け、共有本文をURL queryへ載せない
- Cache対象: App shell / static assets / WMM assets / map vector assetsを候補とする
- Cacheしない対象: `/api/resolve-location` response、共有payload、登録地点データ
- Offline: 保存済み地点と端末APIが使える範囲では方角計算可能。名称付き施設の新規登録は不可

## 12. Analytics

- Page viewを導入する場合も地点名・座標・共有URL・Place IDを含めない
- Custom event候補: add_attempt/add_success/add_failure、direction_open。地点情報は送らない
- API error telemetryはerror code/categoryまで
- User identifierは原則作らない
- Production実機確認では `?internal_test=1` を内部テストモードとして認識する
- 内部テスト判定はURL queryだけを使い、Cookie / localStorage / sessionStorage / fingerprintへ保存しない
- `internal_test=1` でもStorage、地点解決、Geolocation、Orientation、方位計算、Map、UIの挙動は通常Productionと同一に保つ
- 現時点ではAnalytics未導入のため送信抑止対象はない。将来アプリ側Analytics/custom eventを追加する場合は共通 `isInternalTestMode()` 判定を必須gateとする
- 実機確認用URL: `https://omoi-no-hougaku.pages.dev/?internal_test=1`

## 13. Security Boundaries

- `title/text/url/name/lat/lng` を型・長さ・形式で検証する
- 未検証値を`innerHTML`へ挿入しない
- Serverへ送るURLはexact `https://maps.app.goo.gl/...` のみ
- Serverの外部接続先はGoogle API固定endpointのみ
- API keyはCloudflare Secretで管理しBrowserへ返さない
- Browser requestはOrigin必須かつsame-originのみ許可する
- Google API呼び出し前にRateLimitGatewayを必須化し、limit超過時は429で終了する
- Rate Limit keyへURL、地点名、Place ID、座標を含めない
- Server responseは`no-store`
- Human approval points: 外部送信範囲拡大、API追加、Analytics項目追加、Production release

## 14. Test Architecture

| Layer | Test Type | Main Targets |
| --- | --- | --- |
| Core | Unit | shared payload classification / coordinate validation / bearing / distance / heading normalization / alignment / Japan classification / great-circle / antimeridian / max-5 rule |
| Application | Unit/Integration | ReceiveSharedPlace / Register / Delete / ShowDirection |
| Infrastructure | Integration | localStorage / Geolocation / Share Target / resolver client |
| Server | Unit/Integration | request validation / Rate Limiter / Maps Grounding response / Places response / secret absence |
| UI | Regression/E2E | Share -> Confirm -> Save -> Select -> Direction / Compass-Map switch / Japan-World map / mobile layout |
| Security | Static/Regression | URL allowlist / XSS / secret exposure / no sensitive logging |
| Release | Manual | Production/Preview / Android Google Maps share / permission flows |

## 15. 未決事項

- TBD-APP-003: Device Orientation APIのAndroid実機差・補正方法
- TBD-APP-004: 16方位/8方位/角度表示の最終UI
- TBD-APP-007: Web Share Target非対応環境の正式fallback UX
- TBD-APP-008: Japan/World GeoJSONのProduction source・license・simplification
- TBD-APP-009: World Mapのgreat-circle補間点数とviewport戦略
