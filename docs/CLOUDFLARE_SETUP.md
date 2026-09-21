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

- [ ] Output Directoryを`public/`へ変更
- [ ] `public/manifest.webmanifest` / `public/sw.js`をDeploy対象化
- [ ] `/api/resolve-location`のProduction smoke testを維持
- [ ] Preview DeployでSecret/API呼出をどう扱うか確認
- [ ] Google API keyのAPI制限がMaps Grounding Lite + Places API (New)に限定されていることを確認
- [ ] Google Cloudの利用量・課金状態・予算アラートを確認
- [ ] API abuse対策としてCloudflare側rate limiting / challengeの適用可否を確認
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

PoC完了後のMVP本体ではDeploy directoryを`public/`へ変更する。変更は本番Implementation Issue内でWorkflow、smoke test、rollback手順を同時更新する。

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

## 5. Environment Separation

- Production: `main`
- Preview: PR単位でMVP導入時に有効化する
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
- quota / usage上限
- budget alert
- Cloudflare側rate limiting / challenge（適用可能な構成を確認）
- Functions / Google Cloud usageの監視

Public化手順は `PUBLIC_RELEASE_CHECKLIST.md` を正とする。

## 7. Domain・SEO

PoCは技術検証用。MVP本番化IssueでHTTPS、canonical、title、description、OGP、favicon、robots.txt、sitemap.xml、Preview noindexを確認する。

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
