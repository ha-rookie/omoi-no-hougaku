# Cloudflare Setup

## 1. Readiness Check

- [ ] GitHub Repository接続権限
- [ ] Production Branch
- [ ] Build Command
- [ ] Output Directory
- [ ] Node.js version
- [ ] Environment Variables
- [ ] Secrets
- [ ] Bindings
- [ ] Analytics Engine
- [ ] Web Analytics
- [ ] Domain / DNS

## 2. Hello World

mainでProduction Deploy、非main BranchでPreview URLが作られることを確認する。失敗中は機能開発へ進まない。

## 3. Environment Separation

ProductionとPreviewの変数、Secrets、Bindings、書き込み先を分離する。PreviewはProductionデータへ書き込まない。

## 4. Domain・SEO

HTTPS、www有無、canonical、title、description、OGP、favicon、robots.txt、sitemap.xml、Preview noindexを確認する。

## 5. Security

秘密情報をRepositoryへ入れない。Security Headersはbaselineから導入する。CSPは外部script、Beacon、PWA、same-origin APIをPreviewで確認してから強制する。

## 6. Analytics

Production受信を確認し、Previewを本番計測から除外する。Analytics側の未設定とアプリのBuild失敗を分ける。

## 7. Operations

Deploy履歴、ログ、前回正常版、Rollback、障害時判断、データ更新方法を記録する。
