# System Architecture

## 1. 文書目的

この文書は、ユーザー・Cloudflare・GitHub・外部サービス・データストア等を含む「システム全体の構成」の正本とする。

## 2. Architecture Goals

- ARCH-001: コア体験をブラウザ/PWA中心で成立させ、登録地点・表示名をサーバーDBへ保存しない
- ARCH-002: 地点探索はGoogle Mapsへ任せ、アプリ内へ地図UIを持ち込まない
- ARCH-003: 地点解析に失敗した場合は推測で補完せず、ユーザーに失敗を明示する
- ARCH-004: 方位角計算をクライアント内の純粋ロジックとして分離し、テスト可能にする
- ARCH-005: 任意ピンは共有titleの座標を端末内で確定し、外部APIへ送らない
- ARCH-006: 名称付き施設だけ同一origin Pages Function経由でGoogle公式APIを利用し、API keyをBrowserへ露出しない
- ARCH-007: Android Google Maps → Web Share TargetをMVPの地点登録主導線とする
- ARCH-008: Google API呼び出し前にCloudflare Rate Limiter Workerでabuseを抑制する

## 3. System Context

```text
Android Google Maps
      |
      | Web Share Target
      v
想いの方角 PWA / Browser
      |
      +--> share title が lat,lng
      |      -> client validation
      |      -> PlaceCandidate
      |
      +--> share text/url が maps.app.goo.gl
      |      -> POST /api/resolve-location
      |           |
      |           +--> Service binding -> Rate Limiter Worker
      |           |        -> allow / 429
      |           +--> Maps Grounding Lite ResolveMapsUrls
      |           |        -> Place ID
      |           +--> Places API (New) Place Details
      |                    -> latitude / longitude
      |
      +--> Browser Geolocation
      +--> Device Orientation
      +--> localStorage (max 5 places)

GitHub
  -> CI / Review
  -> Cloudflare Pages + Pages Functions
```

登録済み地点の表示・方位計算ではGoogle APIを呼ばない。

## 4. Deployment Architecture

| ID | Component | Platform | Responsibility | Production | Preview |
| --- | --- | --- | --- | --- | --- |
| ARCH-010 | Frontend PWA | Cloudflare Pages | UI、Share Target受信、地点管理、方位角計算、端末センサー連携 | Production branch | PR Preview |
| ARCH-011 | Location Resolver | Cloudflare Pages Functions | 名称付き施設の共有URLをGoogle公式APIでPlace ID→座標へ解決 | `/api/resolve-location` | 同一Route |
| ARCH-012 | Data Store | Browser localStorage | 最大5地点の端末内保存 | User device | Preview originとは別Storage |
| ARCH-013 | External Map | Google Maps | ユーザーによる地点探索・共有 | External | External |
| ARCH-014 | Maps URL Resolution | Maps Grounding Lite | `maps.app.goo.gl`をPlace IDへ解決 | External Google API | External Google API |
| ARCH-015 | Place Details | Places API (New) | Place IDから必要最小限の座標を取得 | External Google API | External Google API |
| ARCH-016 | Secret Store | Cloudflare Pages Secret | Google API key保持 | Production Secret | Preview/Production運用方針に従う |
| ARCH-017 | API Rate Limiter | Cloudflare Worker + Rate Limiting binding | `resolve-location` のGoogle API前段で30 req/60 secを判定 | Service binding only | Preview接続は別途判断 |

### Environment Separation

- ProductionとPreviewのoriginが異なるためlocalStorageも自動的に分離される
- PreviewからProductionの登録地点を読み書きしない
- Pages FunctionはDB・KV・D1等の永続Bindingを持たない
- Production/Previewとも地点URL、地点名、Place ID、座標をApplication logへ出さない
- Google API keyはRepository・HTML・Browser JavaScriptへ配置しない
- 環境差分の具体設定は `CLOUDFLARE_SETUP.md` に分離する
- 同一Repository内のPull Requestは共通PR Preview workflowでCloudflare Pages Previewへdeployし、Production deployとは分離する
- fork由来PRはRepository Secretsを使用するPreview deploy対象外とし、validationのみで扱う

## 5. Runtime Data Flow

### 5.1 保存済み地点から方角を表示

```text
User selects saved place
  -> read latitude/longitude from localStorage
  -> request current position from Browser Geolocation
  -> calculate initial bearing in browser
  -> request/read device orientation when supported
  -> render destination direction
```

### 5.2 新しい地点を登録: 任意ピン

```text
User long-presses arbitrary point in Google Maps
  -> Share -> 想いの方角
  -> Web Share Target receives title/text/url
  -> title matches strict lat,lng
  -> validate latitude [-90,90] / longitude [-180,180]
  -> no Google API call
  -> user confirms + enters private display name
  -> save locally when count < 5
```

### 5.3 新しい地点を登録: 名称付き施設

```text
User opens named place in Google Maps
  -> Share -> 想いの方角
  -> Web Share Target receives title/text/url
  -> title is not strict lat,lng
  -> extract supported maps.app.goo.gl URL from text/url
  -> POST /api/resolve-location
       -> validate request/origin/URL host
       -> Service bindingでRate Limiter Workerへ判定依頼
       -> limit超過なら429で終了
       -> Maps Grounding Lite ResolveMapsUrls
       -> obtain Place ID
       -> Places API (New) Place Details with minimal fields
       -> return latitude/longitude/placeId
  -> validate coordinates in client
  -> user confirms + enters private display name
  -> save locally when count < 5
```

地点解析が失敗した場合は登録処理を止める。短縮URLから任意ピン座標を推測したり、近隣Placeの座標を代用したりしない。

## 6. Build / Update Data Flow

```text
GitHub branch
  -> CI / static checks / tests
  -> Cloudflare Preview
  -> smartphone human review
  -> PR approval
  -> main merge
  -> GitHub Actions + Wrangler
  -> Cloudflare Pages / Pages Functions Production deploy
```

定期バッチ、地点DB更新、サーバー同期はMVPでは該当なし。

## 7. External Dependencies

| ID | Service | Purpose | Runtime Dependency | Auth | Failure Behavior |
| --- | --- | --- | --- | --- | --- |
| IF-001 | Google Maps | 地点探索・共有 | 新規地点追加時 | Google Maps側 | 保存済み地点は利用可能 |
| IF-002 | Browser Geolocation | 現在地取得 | 方角計算時 | User permission | 方角計算を停止し案内表示 |
| IF-003 | Device Orientation | 端末方位取得 | compass-style UI | User permission / browser dependent | 方位角・方角名表示へ縮退 |
| IF-004 | Cloudflare Pages | Static PWA hosting | Yes | Deploy integration | サイト自体が利用不可 |
| IF-005 | Web Share Target / Service Worker | Google Maps共有POSTを端末側で受信 | 新規地点追加時 | PWA install / browser capability | 手動導線は将来fallback候補 |
| IF-006 | `POST /api/resolve-location` | 名称付き施設の共有URLを座標へ解決 | 名称付き施設追加時のみ | Same-origin + server secret | 当該新規登録のみ失敗 |
| IF-007 | Maps Grounding Lite | Maps URL→Place ID | 名称付き施設追加時のみ | Google API key | 新規登録を失敗扱い |
| IF-008 | Places API (New) | Place ID→座標 | 名称付き施設追加時のみ | Google API key | 新規登録を失敗扱い |
| IF-010 | Rate Limiter Worker | Google API前段のabuse抑制 | 名称付き施設追加時のみ | Cloudflare Service binding | 429またはRate Limiter障害時に新規登録を停止 |

## 8. Trust Boundaries / Security

- Browserで保持してよい情報: 表示名、緯度、経度、作成時刻、schema version
- Browserへ出してはいけない情報: Google API keyその他Secret
- Web Share Target: POSTをService Workerで受け、共有本文をURL queryへ載せない。端末内の一時fragmentは表示後に消去する
- 任意ピン: valid `lat,lng` titleならServerへ共有URLを送らない
- Server入力: 名称付き施設解決時の `https://maps.app.goo.gl/...` のみ
- Server側検証: HTTPS、exact host、URL length、body size、Origin必須 + same-origin、Fetch Metadata検証
- Rate Limit: Google API呼び出し前に専用WorkerへService bindingし、初期値30 requests / 60 sec / Cloudflare locationで判定する
- 外部接続: Pages Functionは固定のGoogle API endpointだけを呼ぶ。汎用fetch proxyにしない
- Client入力検証: 緯度 -90〜90、経度 -180〜180、表示名長、共有URL形式を検証する
- 個人情報: 登録地点・表示名はセンシティブ情報として扱いAnalyticsへ送らない
- Logging: request body、共有URL、Place ID、地点名、座標をApplication logへ出さない
- Cache: Resolver responseは `Cache-Control: no-store`

## 9. Availability / Failure Strategy

| Failure | User-visible behavior | Fallback | Logging/Detection |
| --- | --- | --- | --- |
| Google Mapsを開けない | 地点探索ができない旨を表示 | 保存済み地点は利用可能 | 地点情報なしのClient errorのみ |
| Web Share Target unavailable | 共有先として使えない旨を表示 | 将来、貼り付け/座標入力をfallback候補 | capabilityのみ |
| 共有title座標が不正 | 場所を確定できない旨を表示 | 推測しない | error codeのみ |
| Maps Grounding Lite失敗 | 名称付き施設を読み取れない旨を表示 | 再試行/別地点選択 | error categoryのみ |
| Places API失敗 | 地点座標を取得できない旨を表示 | 再試行/別地点選択 | error categoryのみ |
| Rate Limit超過 | 一時的に地点追加できない旨を表示 | 時間を置いて再試行 | HTTP 429 / categoryのみ |
| Rate Limiter Worker障害 | 新規名称付き施設登録を停止 | 保存済み地点は利用可能 | 5xx / categoryのみ |
| Geolocation denied/unavailable | 現在地が取得できない旨を表示 | 方角表示を停止 | Permission/error codeのみ |
| Device Orientation unavailable | コンパス追従不可を表示 | 方位角・方角名の表示へ縮退 | capabilityのみ |
| localStorage unavailable/corrupt | 保存不可または初期化確認を表示 | 一時利用は別判断 | ローカルエラー |
| Analytics unavailable | Core機能へ波及させない | 何もしない | 該当なし |

## 10. Observability

- Cloudflare Web Analytics: 導入可否は別Issueで判断
- Application eventsを導入する場合も、地点名・緯度経度・共有URL・Place IDを送らない
- Production実機確認では `?internal_test=1` を共通内部テストモードとして扱い、将来導入するアプリ側Analytics/custom eventを送信対象外にする
- 内部テスト判定はURL queryのみ。Cookie / localStorage / sessionStorage / fingerprintへ保持しない
- 内部テストモードはAnalytics送信可否以外のRuntime挙動を変えない
- Pages Function logsはerror code/categoryまで。入力URLや座標をconsole出力しない
- Google Cloud側でAPI利用量・課金状態を確認する
- Deployment history: GitHub / Cloudflare
- Privacy boundary: 「どこを想っているか」が分析基盤へ流れないことを優先する

## 11. Performance / Cost

- JavaScript/CSSを必要最小限にし、スマートフォンで素早く起動できることを優先する
- 任意ピン経路はGoogle APIを呼ばない
- 名称付き施設だけ地点追加時に2段階のGoogle API呼び出しを行う
- Places API (New)は必要最小フィールド（id/location）だけ要求する
- 保存済み地点表示・方位計算ではGoogle APIを呼ばない
- Google APIの価格・無料利用枠・クレジット等は変更可能性があるため設計書へ固定金額を書かず、Production release前に公式コンソール/ドキュメントで確認する
- Google API利用量の第一防御はCloudflare Rate Limiter Workerとし、Google Cloud側Quota/Alertは補助策として必要時に再検討する

## 12. Architecture Decisions

重要な選択は `adr/` に残す。

- ADR-0001: Google Maps API不使用方針 — ADR-0004によりSuperseded
- ADR-0002: 保存先は端末内のみ、最大5か所とする — 継続
- ADR-0003: Pages Functionで通常redirectを追う方式 — ADR-0004によりSuperseded
- ADR-0004: Web Share Target + 任意ピン直接座標 + 名称付き施設公式API解決をMVP主導線とする
- ADR-0005: Pages FunctionのGoogle API前段を専用Rate Limiter Workerで保護する

## 13. 未決事項

- TBD-ARCH-006: Google Cloud側Quota/Alertを追加で必要とする利用量・課金条件
- TBD-ARCH-007: Android以外でWeb Share Targetが使えない場合の正式fallback UX
