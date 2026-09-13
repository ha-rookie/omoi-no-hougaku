# System Architecture

## 1. 文書目的

この文書は、ユーザー・Cloudflare・GitHub・外部サービス・データストア等を含む「システム全体の構成」の正本とする。

## 2. Architecture Goals

- ARCH-001: コア体験をブラウザ中心で成立させ、登録地点・表示名をサーバーDBへ保存しない
- ARCH-002: Google Maps APIへ依存せず、外部地図は地点探索の補助として利用する
- ARCH-003: 地点解析に失敗した場合は推測で補完せず、ユーザーに失敗を明示する
- ARCH-004: 方位角計算をクライアント内の純粋ロジックとして分離し、テスト可能にする

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
      +--> [TBD] URL resolver only if client-side short-link resolution is impossible

GitHub
  |
  +--> CI / Build / Review
  |
  v
Cloudflare Pages
```

実際の採用構成に合わせ、使わない要素は削除せず「該当なし」と明記する。

## 4. Deployment Architecture

| ID | Component | Platform | Responsibility | Production | Preview |
| --- | --- | --- | --- | --- | --- |
| ARCH-010 | Frontend | Cloudflare Pages | UI、地点管理、方位角計算、端末センサー連携 | Production branch | PR Preview |
| ARCH-011 | Server/API | 原則なし / TBD | 短縮URL解決がブラウザのみで成立しない場合だけ再検討 | TBD | TBD |
| ARCH-012 | Data Store | Browser localStorage | 最大5地点の端末内保存 | User device | Preview originとは別Storage |
| ARCH-013 | External Map | Google Maps | ユーザーによる地点探索・共有 | External | External |

### Environment Separation

- ProductionとPreviewのoriginが異なるためlocalStorageも自動的に分離される
- PreviewからProductionの登録地点を読み書きしない
- MVPではProduction固有Secretsを原則持たない
- 将来Worker等を追加する場合はProduction/PreviewのBindingsを分離する
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
  -> resolve/extract coordinates (PoC target)
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
  -> Production deploy
```

定期バッチ、地点DB更新、サーバー同期はMVPでは該当なし。

## 7. External Dependencies

| ID | Service | Purpose | Runtime Dependency | Auth | Failure Behavior |
| --- | --- | --- | --- | --- | --- |
| IF-001 | Google Maps | 地点探索・共有リンク生成 | No for saved-place viewing / Yes during place discovery | None from this app | ユーザーへ外部地図が開けない旨を表示 |
| IF-002 | Browser Geolocation | 現在地取得 | Yes for direction calculation | User permission | 方角計算を行わず、許可/設定案内を表示 |
| IF-003 | Device Orientation | 端末方位取得 | Yes for compass-style UI; bearing text may degrade gracefully | User permission / browser dependent | 方位角の数値・方角名のみへ縮退 |
| IF-004 | Cloudflare Pages | Static hosting | Yes | Deploy integration | サイト自体が利用不可 |
| IF-005 | URL Resolver | 短縮URL展開 | TBD | TBD | 地点登録のみ不可。既存地点の方角表示には影響させない |

外部障害時にコア機能まで停止させるか、縮退できるかを明示する。

## 8. Trust Boundaries / Security

- Browserで保持してよい情報: ユーザーが登録した表示名、緯度、経度、schema version
- Browserへ出してはいけない情報: Secrets / tokens。MVPでは原則Secrets自体を持たない
- Server側検証: Serverを採用した場合のみ、URL scheme/host/size/timeouts等を検証する
- Client入力検証: 緯度 -90〜90、経度 -180〜180、表示名長、URL形式を検証する
- CORS / CSP / same-origin: 外部script依存を最小化し、CSP導入時に必要originだけ許可する
- 認証・認可: MVPでは該当なし
- 個人情報: 登録地点・表示名はセンシティブ情報として扱い、Analyticsへ送らない
- Rate limit / abuse対策: Server/Workerを追加する場合に必須化する

## 9. Availability / Failure Strategy

| Failure | User-visible behavior | Fallback | Logging/Detection |
| --- | --- | --- | --- |
| Google Mapsを開けない | 地点探索ができない旨を表示 | 既存保存地点は利用可能 | Client error eventは地点情報を含めない |
| 共有URLを解析できない | 「場所を読み取れませんでした」と表示 | 代替入力方式はPoC後に決定 | 形式カテゴリのみ記録可、URL本文は送信しない |
| Geolocation denied/unavailable | 現在地が取得できない旨を表示 | 方角表示を停止 | Permission state / error codeのみ |
| Device Orientation unavailable | コンパス追従不可を表示 | 方位角・方角名の表示へ縮退 | Capabilityのみ |
| localStorage unavailable/corrupt | 保存不可または初期化確認を表示 | 一時利用のみを検討 | ローカルエラー |
| Analytics unavailable | Core機能へ波及させない | 何もしない | 該当なし |

架空値を生成して正常に見せるより、取得失敗・データ不足を明示する。

## 10. Observability

- Cloudflare Web Analytics: 導入可否は別Issueで判断
- Application events: ページ表示、地点登録成功/失敗、位置情報許可結果など必要最小限。地点名・緯度経度・共有URLを送らない
- Error logs: 個人地点情報を含めない
- Deployment history: GitHub / Cloudflare
- Privacy boundary: 「どこを想っているか」が分析基盤へ流れないことを優先する

## 11. Performance / Cost

- Performance budget: JavaScript/CSSを必要最小限にし、スマートフォンで素早く起動できることを優先する
- Cloudflare無料枠/費用上限: 初期利用規模では無料枠運用を目標とする。最新条件はリリース前に公式情報確認
- API費用上限: Google Maps Platform APIはMVPでは0円（不使用）
- Asset/cache strategy: Static assetsをCloudflare/CDNで配信。センシティブな地点データはcache対象にしない

## 12. Architecture Decisions

重要な選択は `adr/` に残す。

- ADR-0001: MVPではGoogle Maps APIを組み込まない
- ADR-0002: 保存先は端末内のみ、最大5か所とする
- PWA採用: TBD
- URL Resolver採用: Google Maps共有リンクPoC後に決定

## 13. 未決事項

- TBD-ARCH-001: `maps.app.goo.gl` の短縮共有リンクをブラウザのみで安全・安定に展開できるか
- TBD-ARCH-002: TBD-ARCH-001が不成立の場合、Cloudflare Worker等でredirect解決を行うか
- TBD-ARCH-003: Worker利用時に地点URLがサーバーへ送られるプライバシーTrade-offを許容するか
- TBD-ARCH-004: PWA/Web Share TargetをどのReleaseへ含めるか
