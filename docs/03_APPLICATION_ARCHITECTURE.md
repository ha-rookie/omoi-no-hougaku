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
  - Google Maps link input / resolver adapter
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
| APP-033 | PlaceInputResolver | Google Maps共有情報等から候補座標を抽出する | shared/pasted input | PlaceCandidate/Error | 失敗時に座標を捏造しない |

## 4. Dependency Rules

- UIから外部APIを直接呼ぶか: MVPでは原則No。外部I/OはAdapterへ分離する
- Domain/CoreがDOMへ依存するか: No
- InfrastructureがUI状態を持つか: No
- Module間の循環依存: 禁止
- Google Maps固有URL形式: `PlaceInputResolver` のみに閉じ込める
- localStorage schema: `PlaceRepository` のみに閉じ込める
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

- 永続化するのは大切な地点の最小情報だけとする
- localStorageへユーザーアカウント識別子は保存しない
- 壊れた保存値は検証し、正常値として利用しない
- schema versionを持ち、将来のmigrationに備える

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
  -> CoordinateValidator.validate(candidate)
  -> User confirms + names place
  -> RegisterPlaceUseCase checks saved count < 5
  -> PlaceRepository.save()
  -> Home/Direction render
```

`PlaceInputResolver` が解決できない場合は、その時点で処理を止めてエラーを表示する。

## 8. Data Model

| ID | Model | Key Fields | Owner | Validation | Persistence |
| --- | --- | --- | --- | --- | --- |
| DATA-001 | SavedPlace | id, name, latitude, longitude, createdAt | PlaceRepository | name length, lat/lng range, count <= 5 | localStorage |
| DATA-002 | StorageEnvelope | schemaVersion, places | PlaceRepository | schemaVersion, array shape | localStorage |
| DATA-003 | PlaceCandidate | latitude, longitude, sourceType, optional displayHint | PlaceInputResolver | lat/lng range | none until confirmed |
| DATA-004 | DirectionState | targetBearing, directionLabel, deviceHeading?, relativeAngle? | ShowDirectionUseCase | degree normalization | none |

候補schema例:

```json
{
  "schemaVersion": 1,
  "places": [
    {
      "id": "uuid-or-local-id",
      "name": "故郷",
      "latitude": 33.98,
      "longitude": 133.55,
      "createdAt": "2026-09-13T00:00:00.000Z"
    }
  ]
}
```

MVPでは住所全文、Google検索履歴、人物属性を保存しない。

## 9. Interfaces

| ID | Interface | Direction | Request/Input | Response/Output | Error Contract |
| --- | --- | --- | --- | --- | --- |
| IF-001 | PlaceRepository | Internal | CRUD request | SavedPlace[] | StorageUnavailable / CorruptData / LimitExceeded |
| IF-002 | Browser Geolocation | Out | current-position request | coordinates | PermissionDenied / Unavailable / Timeout |
| IF-003 | Device Orientation | Out | permission/start | heading events | Unsupported / PermissionDenied |
| IF-004 | Google Maps external link | Out | search/open URL | Google Maps app/site | OpenFailed |
| IF-005 | PlaceInputResolver | Internal/TBD Out | shared/pasted input | PlaceCandidate | UnsupportedFormat / ResolveFailed / InvalidCoordinates |

短縮URL解決のためServer/Workerを採用する場合は、別ADRでIFを追加する。

## 10. Error Handling

- 入力不正: 保存せず、どの入力が必要かを短く表示する
- Google Maps共有情報解析失敗: 推測せず「場所を読み取れませんでした」とする
- Geolocation失敗: 方角計算を行わず、permission/unavailable/timeoutを区別する
- Orientation失敗: コンパス追従なしで方位角・方向名へ縮退する
- Storage失敗: 保存できないことを明示し、成功表示しない
- 保存件数超過: 既存地点を自動上書きせず、削除を促す
- Analytics失敗: Core機能へ波及させない

「例外を握りつぶして正常値を返す」を標準にしない。

## 11. PWA / Offline

- PWA採用: TBD
- Service Worker: 基本フロー完成後に検討
- Cache対象: App shell / static assetsを候補とする
- Cacheしない対象: 登録地点を含む動的レスポンス。MVPではServer保存自体なし
- 更新戦略: TBD
- Offline時の縮退: 保存済み地点と現在地/センサーが利用可能なら方角計算はクライアントで成立可能。地点新規探索はGoogle Mapsに依存するため不可の場合あり
- Web Share Target: Android中心にPoC候補

## 12. Analytics

- Page view: 導入する場合も地点名・座標を含めない
- Custom event: add_attempt/add_success/add_failure、direction_open等を候補とするが、地点情報は送らない
- User identifier: 原則作らない
- Failure isolation: Analytics送信失敗はCore処理と分離する

## 13. Security Boundaries

- Sanitization / validation: name、URL/text input、lat/lngを検証。`innerHTML` への未検証挿入を避ける
- Secrets access layer: MVPでは原則Secretsなし
- CSP impact: Google Mapsを外部遷移として扱うため、埋め込み許可は不要を目標とする
- Dangerous operations: 外部URL open時はscheme/hostを検証する
- Human approval points: Worker導入、外部送信、Analytics項目追加、PWA share target、Production release

## 14. Test Architecture

| Layer | Test Type | Main Targets |
| --- | --- | --- |
| Core | Unit | Bearing calculation / degree normalization / coordinate validation / max-5 rule |
| Application | Unit/Integration | Register / Delete / ShowDirection use cases |
| Infrastructure | Integration | localStorage / Geolocation adapters / shared-link resolver |
| UI | Regression/E2E | Add -> Save -> Select -> Direction / mobile layout |
| Security | Static/Regression | URL validation / XSS / CSP / external input |
| Release | Manual | Preview / Android smartphone / secret mode / permission flows |

共有リンクPoCでは最低限以下をテストする。

- 市区町村
- 国内住所
- 海外住所
- 有名施設
- 店舗/病院等の施設
- 任意地点
- 壊れたURL
- Google Maps以外のURL

## 15. 未決事項

- TBD-APP-001: Google Maps短縮共有URLの解決方式
- TBD-APP-002: 短縮URLがクライアントのみで解決不能な場合の代替フロー
- TBD-APP-003: Device Orientation APIのAndroid実機差・補正方法
- TBD-APP-004: 16方位/8方位/角度表示の最終UI
- TBD-APP-005: PWA/Web Share Targetの採用時期
