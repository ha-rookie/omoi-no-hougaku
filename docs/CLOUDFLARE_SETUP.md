# Cloudflare Setup

## 1. Readiness Check

### 現在のPoC

- [x] GitHub Repository接続権限
- [x] GitHub Repository visibility: Public（2026-09-21）
- [x] Production Branch: `main`
- [x] Build Command: なし
- [x] Output Directory: `poc/google-maps-share-link`
- [x] Pages project: `omoi-no-hougaku`
- [x] Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `MAPS_GROUNDING_API_KEY`
- [x] Pages Functions: `/functions`を同時Deploy
- [x] Production URL: `https://omoi-no-hougaku.pages.dev/`
- [x] API POSTはOrigin必須 + same-origin検証
- [x] Fetch Metadataが存在する場合はsame-origin検証
- [x] Public Repository化後、PR用GitHub-hosted runnerでProject validation / PoC testsが成功

### MVP本番移行時

Issue #61でProduction deploy pipelineをPoCからMVP本体へ切り替える。

- [x] Deploy workflowのOutput Directoryを`public/`へ変更
- [x] `public/manifest.webmanifest` / `public/sw.js` / 承認済み背景AssetをDeploy対象化
- [x] `/api/resolve-location`のProduction smoke testを維持
- [x] build markerを`public/build.json`へ出力し、Production main SHAとの一致をsmoke testする
- [x] main以外からの`workflow_dispatch`によるProduction deployをjob guardで禁止
- [x] PR #60のVisual Previewで同一`public/` UIをスマホ確認済み
- [ ] Issue #61 merge後にProduction deploy / smoke成功を確認
- [x] Google API keyはMaps Grounding Lite + Places API (New)だけにAPI制限する方針を確認済み
- [x] Google Cloud側のQuota編集/課金停止をrelease gateにしない。現在の利用条件ではQuota編集が利用できず、Budget Alertもhard stopではないため、Google API到達前のCloudflare Rate Limiter Workerを実効的な自動制限として採用済み
- [x] API abuse対策は専用Cloudflare Worker + Rate Limiting binding方式に決定（ADR-0005）
- [x] Rate Limiter WorkerをProductionへDeploy（Worker version `0106d89a-c32e-48e0-a298-394b2730b4cf`）
- [x] GitHub ActionsからPages productionへService binding `RATE_LIMITER_SERVICE` を自動設定
- [ ] SEO/robots/Preview noindexを本番方針に合わせる

## 2. Deploy方式

Cloudflare DashboardからGitHub RepositoryをImportする方式は採用しない。

GitHub ActionsからWranglerでCloudflare PagesへDeployする。

```text
GitHub main
  -> GitHub Actions
  -> cloudflare/wrangler-action
  -> Cloudflare Pages + Pages Functions
```

Workflowは `.github/workflows/deploy-pages.yml` を正とする。

Rate Limiter Workerは `.github/workflows/deploy-rate-limiter.yml` で別Deployする。Workerを先にDeployし、その後 `.github/workflows/deploy-pages.yml` がCloudflare Pages Project APIでproduction Service bindingを追加・確認してからPagesをDeployする。Cloudflare Dashboardでの手動binding設定は不要とする。

Issue #61でMVP本体のDeploy directoryを`public/`へ変更する。Cloudflare公式Direct Upload仕様に従い、Repository rootから`wrangler pages deploy public`を実行することで、rootの`functions/`もPages Functionsとして同時Deployする。Workflow、smoke test、rollback確認を同一Release変更として扱う。

## 3. Runtime Secret

Google API keyはRepositoryやBrowserへ置かず、Cloudflare Pages Secret `MAPS_GROUNDING_API_KEY`として保持する。

現在はGitHub Actions Secretの同名値をWranglerでPages Secretへ同期している。

```text
GitHub Actions Secret
  MAPS_GROUNDING_API_KEY
       |
       v
wrangler pages secret put
       |
       v
Cloudflare Pages Secret
       |
       v
Pages Function context.env.MAPS_GROUNDING_API_KEY
       |
       +--> Maps Grounding Lite
       +--> Places API (New)
```

ルール:

- Secret値をRepository、PR本文、Issue、Actions logへ出さない
- Function responseへAPI keyを含めない
- Browser JavaScriptからGoogle APIを直接呼ばない
- API keyのGoogle Cloud側API制限を必要APIだけに限定する
- key rotation時はGitHub/Cloudflareの同期経路を確認する

## 4. Pages Functions

MVP本番で必要なEndpoint:

- `POST /api/resolve-location`
  - 入力: `https://maps.app.goo.gl/...`
  - Maps Grounding LiteでPlace ID取得
  - Places API (New)で`id/location`のみ取得
  - 出力: 緯度経度と必要最小情報
  - DB/KV/D1へ保存しない
  - `Cache-Control: no-store`
  - 共有URL、Place ID、座標をApplication logへ出さない

旧PoC endpointは本番Implementation後にCleanup Issueで削除可否を判断する。

### Rate Limiter Worker

- Worker: `omoi-no-hougaku-rate-limiter`
- Source: `workers/api-rate-limiter/`
- Public route: なし
- `workers_dev: false`
- `preview_urls: false`
- 初期値: 30 requests / 60 seconds
- key: `resolve-location`
- Pages側binding名: `RATE_LIMITER_SERVICE`
- Production bindingはGitHub ActionsがPages Project APIで設定・検証する
- 既存の他Service bindingがある場合はGETした設定へ追記して保持する

## 5. Environment Separation

- Production: `main`。Issue #61以降は`public/` + `functions/`をGitHub Actions / WranglerでDeploy
- Preview: PR単位。UIのVisual PreviewではProduction localStorageと分離したbranch originを使う
- Production/Previewはoriginが異なるためlocalStorageを共有しない
- PreviewからProductionの地点データへアクセスしない
- PreviewでGoogle APIを呼ぶ場合もProductionと同じPrivacy/Security条件を守る
- Preview Secret運用がProductionと異なる場合はWorkflow/Cloudflare設定で明示する

## 6. Security

- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `MAPS_GROUNDING_API_KEY`はSecretsで管理する
- 登録地点・表示名をCloudflare側へ永続保存しない
- 任意ピンの共有titleが有効な座標ならServer/APIへ送らない
- 名称付き施設だけ共有短縮URLを`/api/resolve-location`へ送る
- POST Endpointは`Origin`必須とし、Request URLとsame-originであることを検証する
- `Sec-Fetch-Site`が存在する場合は`same-origin`のみ許可する
- API responseは`Cross-Origin-Resource-Policy: same-origin`、`Cache-Control: no-store`を返す
- URL host、body size、content typeを検証する
- Google API以外の任意hostへfetchする汎用proxyにしない

### Security boundary

Origin / Fetch Metadataはブラウザ経由のcross-site利用を減らす防御であり、認証ではない。curl等はヘッダーを偽装できるため、匿名公開APIを「正規ユーザーだけ」に完全制限するものではない。

Google API利用量のabuse対策は以下を組み合わせる。

- Google Cloud側のAPI restrictions
- Cloudflare Rate Limiter Workerによる自動遮断
- Google Cloud quota / alertは必要時の補助策として再検討
- Functions / Google Cloud usageの監視

Public化手順は `PUBLIC_RELEASE_CHECKLIST.md` を正とする。

## 7. Domain・SEO

Issue #61でMVP Production公開時の最小SEOを確定する。

- Production URL: `https://omoi-no-hougaku.pages.dev/`
- `rel=canonical`: Production URLを指定
- title / description: アプリ用途が分かる説明へ更新
- robots: Productionはindex可能。APIとWeb Share Target routeはcrawl対象外
- sitemap: root URLのみを`public/sitemap.xml`へ掲載
- favicon: `public/assets/app-icon.svg`
- OGP/Twitter: title / description / canonical URLを指定。専用OGP画像は別Issueで扱い、Production切替をブロックしない
- Preview: Cloudflare PagesがPreview deploymentへ既定で `X-Robots-Tag: noindex` を付与するため、その標準挙動を利用する
- GSC: Production公開後にsitemapを登録し、URL検査でcanonical/index状態を確認する

一次情報:
- Google canonical: https://developers.google.com/search/docs/crawling-indexing/canonicalization
- Google robots.txt: https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec
- Cloudflare Pages Preview noindex: https://developers.cloudflare.com/pages/configuration/preview-deployments/

地点名・座標等のlocal-onlyデータをmetadataへ出さない。

## 8. Analytics

現時点ではAnalyticsをCore要件にしない。

将来導入する場合も地点名、緯度経度、Google Maps共有URL、Place IDをAnalyticsへ送信しない。

## 9. Operations

- Deploy履歴: GitHub Actions / Cloudflare Pages
- Deploy失敗: GitHub Actions job logで確認
- Rollback: 前回正常commitから再Deploy
- Project作成: Workflow内の `wrangler pages project create` を冪等実行
- API障害: 新規名称付き施設登録だけを失敗させ、保存済み地点利用へ波及させない
- Security smoke test: OriginなしPOSTは403 / `ORIGIN_REQUIRED`
- Cost review: Production release前後にGoogle Cloud Consoleで利用量・課金を確認する

## 10. Rate Limiter導入確認

- Rate Limiter Worker Deploy: success
- Worker version: `0106d89a-c32e-48e0-a298-394b2730b4cf`
- Pages Service binding自動設定: success
- Production Pages deploy: success
- Production smoke test: success
- Production main SHA: `87abc85200f927d72e3ba80c351b330a040de1fd`
- 意図的な30回超過の本番負荷試験はGoogle APIへの不要な実リクエストを避けるため未実施。Rate Limiter Worker単体testとPages Service binding client testで429/503経路を確認済み
