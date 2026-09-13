# Application Architecture

## 1. 文書目的

この文書は、アプリ内部の論理構成、Module責務、依存関係、状態、データ処理、エラー境界の正本とする。

システム外部との配置関係は `02_SYSTEM_ARCHITECTURE.md`、物理ファイル配置は `04_REPOSITORY_STRUCTURE.md` に分離する。

## 2. Logical Architecture

```text
Presentation / UI
  - Place List
  - Add Place
  - Direction View
  - Permission / Error UI
      |
      v
Application / Use Cases
  - Register Place
  - Select Place
  - Delete Place
  - Show Direction
      |
      v
Domain / Core Logic
  - Coordinate Validation
  - Bearing Calculation
  - Direction Naming
  - Saved-place Limit Rule
      |
      v
Infrastructure
  - localStorage
  - Geolocation
  - Device Orientation
  - Google Maps direct URL parser
  - Same-origin Pages Function resolver client
      |
      v
Cloudflare Pages Function
  - /api/resolve-map
  - Google short-link redirect validation
```

Domain/CoreはDOM、Cloudflare、Google Maps固有URL形式に依存させない。

## 3. Component Responsibilities

| ID | Component | Responsibility | Inputs | Outputs | Must Not Do |
| --- | --- | --- | --- | --- | --- |
| APP-001 | PlaceListUI | 保存地点の一覧・選択・削除操作 | SavedPlace[] | User action | 方位角計算を持たない |
| APP-002 | AddPlaceUI | 共有リンク/入力、表示名、確認画面 | User input | Register request | URL解析ロジックを抱え込まない |
| APP-003 | DirectionUI | 目的地方向を文字・角度・視覚要素で表示 | DirectionState | Rendered UI | センサー値の取得処理を直接持たない |
| APP-010 | RegisterPlaceUseCase | 地点入力の検証、最大5件ルール、保存 | Place candidate | SavedPlace | DOM操作をしない |
| APP-011 | ShowDirectionUseCase | 現在地と目的地を取得し方向状態を組み立てる | SavedPlace | DirectionState | localStorage形式へ依存しない |
| APP-020 | CoordinateValidator | 緯度経度を検証する | lat/lng | Valid/Invalid | 推測座標を生成しない |
| APP-021 | BearingCalculator | 2地点間の初期方位角を計算する | from/to coordinates | degrees 0-360 | DOM/センサーへ依存しない |
| APP-022 | DirectionLabeler | 角度を北/北東等の表現へ変換する | degrees | label | 位置情報を保存しない |
| APP-030 | PlaceRepository | SavedPlaceのlocalStorage読み書き | SavedPlace | SavedPlace[] | Network送信しない |
| APP-031 | GeolocationAdapter | Browser Geolocationを抽象化する | permission/request | CurrentPosition | 目的地を扱わない |
| APP-032 | OrientationAdapter | Device Orientationを抽象化する | permission/events | heading | 方位角計算をしない |
| APP-033 | PlaceInputResolver | Google Maps共有情報から候補座標を得る。direct URLはClient解析、短縮URLはResolverClientへ委譲 | shared/pasted input | PlaceCandidate/Error | 失敗時に座標を捏造しない |
| APP-034 | ResolverClient | 同一originの `/api/resolve-map` を呼ぶ | short Google Maps URL | coordinates/error | 地点名・保存済み地点を送信しない |
| APP-035 | ServerShortLinkResolver | Google short URLのredirectを安全に追跡し座標を抽出する | short URL | coordinates/sourceType | 汎用proxy化、DB保存、入力URL loggingをしない |

## 4. Dependency Rules

- UIから外部APIを直接呼ばず、外部I/OはAdapter/Clientへ分離する
- Domain/CoreがDOMやCloudflareへ依存するか: No
- InfrastructureがUI状態を持つか: No
- Module間の循環依存: 禁止
- Google Maps固有URL形式: PlaceInputResolver / ServerShortLinkResolverのみに閉じ込める
- localStorage schema: PlaceRepositoryのみに閉じ込める
- Pages FunctionはlocalStorageやSavedPlace modelへ依存しない
- 外部ライブラリ追加条件: 標準Web APIでは解決困難で、bundle/cost/privacy上の理由を説明できる場合のみ

## 5. Routing / Screen Composition

MVPはSPAまたは単一ページ内の状態遷移を第一候補とする。最終方式はUI設計時に確定する。

| ID | Route/Screen | Purpose | Entry | Main Actions | Exit |
| --- | --- | --- | --- | --- | --- |
| UI-001 | Home / Place List | 保存済みの大切な場所を選ぶ | App start | 選択、追加、削除 | Direction / Add |
| UI-002 | Add Place | Google Maps共有情報から場所を登録 | Home | 入力、読取、確認、命名、保存 | Home / Direction |
| UI-003 | Direction | 選択地点の方角を向く | Place selected | 位置許可、方角確認 | Home |
| UI-004 | Permission/Error State | 必要な許可・失敗理由を伝える | Runtime failure | 再試行、設定確認、戻る | Previous screen |

画面の視覚詳細は `design/` を正本とし、ここでは役割と遷移だけを扱う。

## 6. State Management

| State | Scope | Source of Truth | Persistence | Reset Condition |
| --- | --- | --- | --- | --- |
| savedPlaces | App | PlaceRepository | localStorage | User delete / storage clear / schema migration |
| selectedPlaceId | UI/App | Runtime state | none | Home return / reload |
| currentPosition | Runtime | GeolocationAdapter | none | Reload / new request |
| deviceHeading | Runtime | OrientationAdapter | none | Reload / sensor stop |
| addPlaceDraft | UI | Form state | none | Save / cancel / reload |
| permissionState | Runtime | Browser APIs | none | Browser/OS permission change |

Pages FunctionはApplication stateを持たない。短縮URL・座標を永続化しない。

## 7. Runtime Sequence

### 7.1 Direction表示

```text
User selects saved place
  -> ShowDirectionUseCase
  -> GeolocationAdapter.getCurrentPosition()
  -> BearingCalculator.calculate(current, target)
  -> DirectionLabeler.label(bearing)
  -> OrientationAdapter.start() when supported/allowed
  -> DirectionUI render
```

### 7.2 Place登録

```text
User pastes/shares Google Maps information
  -> AddPlaceUI validates basic input
  -> PlaceInputResolver.resolve(input)
      -> direct Google Maps URL: client-side parse
      -> maps.app.goo.gl: ResolverClient POST /api/resolve-map
           -> ServerShortLinkResolver validates input
           -> fetch redirect: manual
           -> validate every redirect scheme/host
           -> extract reliable coordinates only
           -> return latitude/longitude/sourceType
  -> CoordinateValidator.validate(candidate)
  -> User confirms + names place
  -> RegisterPlaceUseCase checks saved count < 5
  -> PlaceRepository.save()
  -> Home/Direction render
```

## 8. Data Model

| ID | Model | Key Fields | Owner | Validation | Persistence |
| --- | --- | --- | --- | --- | --- |
| DATA-001 | SavedPlace | id, name, latitude, longitude, createdAt | PlaceRepository | name length, lat/lng range, count <= 5 | localStorage |
| DATA-002 | StorageEnvelope | schemaVersion, places | PlaceRepository | schemaVersion, array shape | localStorage |
| DATA-003 | PlaceCandidate | latitude, longitude, sourceType, optional displayHint | PlaceInputResolver | lat/lng range | none until confirmed |
| DATA-004 | DirectionState | targetBearing, directionLabel, deviceHeading?, relativeAngle? | ShowDirectionUseCase | degree normalization | none |
| DATA-005 | ResolveMapRequest | url | ResolverClient / ServerShortLinkResolver | HTTPS, exact short host, length | none |
| DATA-006 | ResolveMapResponse | ok, latitude?, longitude?, sourceType?, error? | ServerShortLinkResolver | no input URL echo | none |

MVPでは住所全文、Google検索履歴、人物属性を保存しない。

## 9. Interfaces

| ID | Interface | Direction | Request/Input | Response/Output | Error Contract |
| --- | --- | --- | --- | --- | --- |
| IF-001 | PlaceRepository | Internal | CRUD request | SavedPlace[] | StorageUnavailable / CorruptData / LimitExceeded |
| IF-002 | Browser Geolocation | Out | current-position request | coordinates | PermissionDenied / Unavailable / Timeout |
| IF-003 | Device Orientation | Out | permission/start | heading events | Unsupported / PermissionDenied |
| IF-004 | Google Maps external link | Out | search/open URL | Google Maps app/site | OpenFailed |
| IF-005 | PlaceInputResolver | Internal | shared/pasted input | PlaceCandidate | UnsupportedFormat / ResolveFailed / InvalidCoordinates |
| IF-006 | `POST /api/resolve-map` | Client -> same-origin Pages Function | `{ "url": "https://maps.app.goo.gl/..." }` | `{ ok, latitude, longitude, sourceType }` | 4xx input/privacy boundary, 5xx upstream/redirect failure |

IF-006 responseへ入力URL、redirect URL、地点名を含めない。

## 10. Error Handling

- 入力不正: 保存せず、どの入力が必要かを短く表示する
- Google Maps共有情報解析失敗: 推測せず「場所を読み取れませんでした」とする
- Resolver input拒否: Google Maps短縮URL以外をServerへ送らない
- Resolver upstream失敗: 新規地点登録だけ失敗させ、保存済み地点機能へ波及させない
- Geolocation失敗: 方角計算を行わず、permission/unavailable/timeoutを区別する
- Orientation失敗: コンパス追従なしで方位角・方向名へ縮退する
- Storage失敗: 保存できないことを明示し、成功表示しない
- 保存件数超過: 既存地点を自動上書きせず、削除を促す
- Analytics失敗: Core機能へ波及させない

## 11. PWA / Offline

- PWA採用: TBD
- Service Worker: 基本フロー完成後に検討
- Cache対象: App shell / static assetsを候補とする
- Cacheしない対象: `/api/resolve-map` response、登録地点を含む動的情報
- 更新戦略: TBD
- Offline時の縮退: 保存済み地点と現在地/センサーが利用可能なら方角計算はクライアントで成立可能。短縮URLからの新規登録は不可
- Web Share Target: Android中心にPoC候補

## 12. Analytics

- Page view: 導入する場合も地点名・座標を含めない
- Custom event: add_attempt/add_success/add_failure、direction_open等を候補とするが、地点情報は送らない
- Resolver event: error code/categoryまで。入力URL、redirect先、座標は送らない
- User identifier: 原則作らない
- Failure isolation: Analytics送信失敗はCore処理と分離する

## 13. Security Boundaries

- Sanitization / validation: name、URL/text input、lat/lngを検証。`innerHTML` への未検証挿入を避ける
- Resolver SSRF: exact short host + Google Maps allowlist + manual redirect + redirect上限
- Resolver request: body size / URL lengthを制限
- Resolver browser access: Originがある場合はsame-originのみ
- Secrets access layer: Runtime Secrets不要
- CSP impact: same-origin `/api/resolve-map` のみ追加。Google Maps埋め込みは行わない
- Dangerous operations: 外部URL open時とServer fetch時にscheme/hostを検証する
- Human approval points: 外部送信範囲拡大、Analytics項目追加、PWA share target、Production release

## 14. Test Architecture

| Layer | Test Type | Main Targets |
| --- | --- | --- |
| Core | Unit | Bearing calculation / degree normalization / coordinate validation / max-5 rule |
| Application | Unit/Integration | Register / Delete / ShowDirection use cases |
| Infrastructure | Integration | localStorage / Geolocation adapters / shared-link resolver |
| Server Resolver | Unit/Integration | redirect parsing / host allowlist / max redirects / coordinate extraction |
| UI | Regression/E2E | Add -> Save -> Select -> Direction / mobile layout |
| Security | Static/Regression | URL validation / SSRF guard / XSS / CSP / external input |
| Release | Manual | Production/Preview / Android smartphone / permission flows |

## 15. 未決事項

- TBD-APP-003: Device Orientation APIのAndroid実機差・補正方法
- TBD-APP-004: 16方位/8方位/角度表示の最終UI
- TBD-APP-005: PWA/Web Share Targetの採用時期
- TBD-APP-006: Resolver利用量が増えた場合のRate Limit方式
