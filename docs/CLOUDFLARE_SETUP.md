# Cloudflare Setup

## 1. Readiness Check

- [x] GitHub Repository接続権限
- [x] Production Branch: `main`
- [x] Build Command: なし（PoCは静的ファイルを直接Deploy）
- [x] Output Directory: `poc/google-maps-share-link`
- [x] Node.js version: GitHub Actions runner標準 + Wrangler Action側管理
- [x] Environment Variables: なし
- [x] Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- [x] Bindings: なし
- [ ] Analytics Engine: PoCでは不要
- [ ] Web Analytics: PoCでは不要
- [ ] Domain / DNS: PoCでは `omoi-no-hougaku.pages.dev` を利用

## 2. Deploy方式

Cloudflare DashboardからGitHub RepositoryをImportする方式は採用しない。

既存アプリと同じく、GitHub ActionsからWranglerでCloudflare PagesへDeployする。

```text
GitHub main
  -> GitHub Actions
  -> cloudflare/wrangler-action
  -> Cloudflare Pages
```

- Pages project: `omoi-no-hougaku`
- Production branch: `main`
- Deploy directory: `poc/google-maps-share-link`
- Production URL: `https://omoi-no-hougaku.pages.dev/`

Workflowは `.github/workflows/deploy-pages.yml` を正とする。

## 3. Hello World / PoC Deploy

mainへのMergeでProduction Deployを実行する。

PoC段階では以下を配信する。

- `poc/google-maps-share-link/index.html`
- `poc/google-maps-share-link/resolver.mjs`
- Deploy時に生成する `build.json`

Deploy後は `build.json` のSHAとGitHub ActionsのSHAが一致することをsmoke testで確認する。

## 4. Environment Separation

- PoCのProductionは `main` のみ
- 登録地点の保存機能はまだ存在しない
- MVP本体実装時にPreview Deployを追加する
- 将来Worker / Functions / Bindingsを追加する場合はProductionとPreviewを分離する

## 5. Security

- `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` はGitHub Actions Secretsで管理する
- Secret値をRepositoryへcommitしない
- PoCではGoogle Maps API keyを利用しない
- 登録地点をCloudflare側へ保存しない

## 6. Domain・SEO

PoCは技術検証用のため、SEO公開設計はMVP本体実装時に行う。

本番アプリ化時にHTTPS、canonical、title、description、OGP、favicon、robots.txt、sitemap.xml、Preview noindexを確認する。

## 7. Analytics

PoCではAnalyticsを導入しない。

将来導入する場合も地点名、緯度経度、Google Maps共有URLをAnalyticsへ送信しない。

## 8. Operations

- Deploy履歴: GitHub Actions / Cloudflare Pages
- Deploy失敗: GitHub Actions job logで確認
- Rollback: 前回正常commitから再Deploy
- Project作成: Workflow内の `wrangler pages project create` を冪等実行する
- PoC完了後、MVP本体の配信Directoryへ変更する場合は設計書とWorkflowを同一Issueで更新する
