# System Architecture

## 1. 文書目的

この文書は、ユーザー・Cloudflare・GitHub・外部サービス・データストア等を含む「システム全体の構成」の正本とする。

## 2. Architecture Goals

- ARCH-001: コア体験をブラウザ中心で成立させ、登録地点・表示名をサーバーDBへ保存しない
- ARCH-002: Google Maps APIへ依存せず、外部地図は地点探索の補助として利用する
- ARCH-003: 地点解析に失敗した場合は推測で補完せず、ユーザーに失敗を明示する
- ARCH-004: 方位角計算をクライアント内の純粋ロジックとして分離し、テスト可能にする
- ARCH-005: Google Maps短縮URLの展開だけをPages Functionへ限定し、地点情報のサーバー保存を行わない

## 3. System Context

```text
User / Smartphone Browser
      |
      v
想いの方角 Web App
      |
      +--> Browser Geolocation
      |
      +--> Device Orientation
      |
      +--> localStorage (max 5 places)
      |
      +--> Google Maps (external app/site, API not used)
      |
      +--> Cloudflare Pages Function /api/resolve-map
              |
              +--> maps.app.goo.gl redirect resolution only

GitHub
  |
  +--> CI / Build / Review
  |
  v
Cloudflare Pages + Pages Functions
```

## 4. Deployment Architecture

| ID | Component | Platform | Responsibility | Production | Preview |
| --- | --- | --- | --- | --- | --- |
| ARCH-010 | Frontend | Cloudflare Pages | UI、地点管理、方位角計算、端末センサー連携 | Production branch | PR Preview |
| ARCH-011 | Short URL Resolver | Cloudflare Pages Functions | `maps.app.goo.gl` のredirectを検証し、確実な座標だけ返す | `/api/resolve-map` | 同一Route |
| ARCH-012 | Data Store | Browser localStorage | 最大5地点の端末内保存 | User device | Preview originとは別Storage |
| ARCH-013 | External Map | Google Maps | ユーザーによる地点探索・共有 | External | External |

### Environment Separation

- ProductionとPreviewのoriginが異なるためlocalStorageも自動的に分離される
- PreviewからProductionの登録地点を読み書きしない
- Pages FunctionはDB・KV・D1等の永続Bindingを持たない
- Production/Previewとも地点URL、地点名、座標をApplication logへ出さない
- 環境差分がある場合はこの文書と `CLOUDFLARE_SETUP.md` の役割を分ける
  - なぜ分けるか・何を分けるか → 本文書
  - 具体的な設定手順 → Cloudflare Setup

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

### 5.2 新しい地点を登録

```text
User searches place in Google Maps
  -> user copies/shares Google Maps link
  -> 想いの方角 receives pasted/shared text
  -> validate supported URL/input format
  -> direct Google Maps URL: parse in browser
  -> maps.app.goo.gl short URL:
       POST /api/resolve-map
       -> Pages Function validates scheme/host/redirect count
       -> follows Google redirect manually
       -> extracts only reliable coordinates
       -> returns latitude/longitude/sourceType
  -> user confirms location + enters display name
  -> validate latitude/longitude/name
  -> save locally if stored count < 5
```

地点解析が失敗した場合は登録処理を止める。架空座標や推測値で成功扱いしない。

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
| IF-001 | Google Maps | 地点探索・共有リンク生成 | No for saved-place viewing / Yes during place discovery | None from this app | ユーザーへ外部地図が開けない旨を表示 |
| IF-002 | Browser Geolocation | 現在地取得 | Yes for direction calculation | User permission | 方角計算を行わず、許可/設定案内を表示 |
| IF-003 | Device Orientation | 端末方位取得 | Yes for compass-style UI; bearing text may degrade gracefully | User permission / browser dependent | 方位角の数値・方角名のみへ縮退 |
| IF-004 | Cloudflare Pages | Static hosting | Yes | Deploy integration | サイト自体が利用不可 |
| IF-005 | Pages Function URL Resolver | Google Maps短縮共有URLの一時展開 | Yes only when adding a short-link place | Same-origin browser request | 新規地点登録のみ不可。保存済み地点は利用可能 |

## 8. Trust Boundaries / Security

- Browserで保持してよい情報: ユーザーが登録した表示名、緯度、経度、schema version
- Browserへ出してはいけない情報: Secrets / tokens。MVPではRuntime Secretsは原則不要
- Server入力: `https://maps.app.goo.gl/...` のみ
- Server側検証: HTTPS、入力host、各redirect先host、URL長、body size、redirect上限
- SSRF対策: allowlist外hostへredirectしない。汎用URL fetch proxyにしない
- Client入力検証: 緯度 -90〜90、経度 -180〜180、表示名長、URL形式を検証する
- Same-origin: BrowserからのResolver利用はOriginがある場合に同一originのみ許可する
- 認証・認可: MVPではユーザー認証なし。Resolverは機能限定・入力限定で公開する
- 個人情報: 登録地点・表示名はセンシティブ情報として扱い、Analyticsへ送らない
- Logging: request body、共有URL、地点名、座標をApplication logへ出さない
- Cache: Resolver responseは `Cache-Control: no-store`

## 9. Availability / Failure Strategy

| Failure | User-visible behavior | Fallback | Logging/Detection |
| --- | --- | --- | --- |
| Google Mapsを開けない | 地点探索ができない旨を表示 | 既存保存地点は利用可能 | Client error eventは地点情報を含めない |
| 共有URLを解析できない | 「場所を読み取れませんでした」と表示 | 将来の座標手入力をfallback候補とする | error codeのみ。URL本文は記録しない |
| Pages Function / Google redirect失敗 | 短縮URLを読み取れない旨を表示 | direct URL/既存地点は利用可能 | error codeのみ。URL本文は記録しない |
| Geolocation denied/unavailable | 現在地が取得できない旨を表示 | 方角表示を停止 | Permission state / error codeのみ |
| Device Orientation unavailable | コンパス追従不可を表示 | 方位角・方角名の表示へ縮退 | Capabilityのみ |
| localStorage unavailable/corrupt | 保存不可または初期化確認を表示 | 一時利用のみを検討 | ローカルエラー |
| Analytics unavailable | Core機能へ波及させない | 何もしない | 該当なし |

架空値を生成して正常に見せるより、取得失敗・データ不足を明示する。

## 10. Observability

- Cloudflare Web Analytics: 導入可否は別Issueで判断
- Application events: ページ表示、地点登録成功/失敗、位置情報許可結果など必要最小限。地点名・緯度経度・共有URLを送らない
- Resolver logs: 入力URL・取得座標をconsole出力しない。必要ならerror code/categoryのみ
- Deployment history: GitHub / Cloudflare
- Privacy boundary: 「どこを想っているか」が分析基盤へ流れないことを優先する

## 11. Performance / Cost

- Performance budget: JavaScript/CSSを必要最小限にし、スマートフォンで素早く起動できることを優先する
- Cloudflare無料枠/費用上限: 初期利用規模では無料枠運用を目標とする。最新条件はリリース前に公式情報確認
- API費用上限: Google Maps Platform APIはMVPでは0円（不使用）
- Resolver: 地点追加時のみ呼び出し、保存済み地点表示では呼び出さない
- Asset/cache strategy: Static assetsをCloudflare/CDNで配信。センシティブな地点データはcache対象にしない

## 12. Architecture Decisions

重要な選択は `adr/` に残す。

- ADR-0001: MVPではGoogle Maps APIを組み込まない
- ADR-0002: 保存先は端末内のみ、最大5か所とする
- ADR-0003: Google Maps短縮URLはPages Functionで一時展開する
- PWA採用: TBD

## 13. 未決事項

- TBD-ARCH-004: PWA/Web Share TargetをどのReleaseへ含めるか
- TBD-ARCH-005: Resolverの本番Rate Limitが必要になる利用規模の閾値
