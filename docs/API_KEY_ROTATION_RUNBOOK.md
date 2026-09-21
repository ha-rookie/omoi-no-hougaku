# Google Maps API Key Rotation Runbook

## 1. 目的

`MAPS_GROUNDING_API_KEY` の漏えい疑い、異常利用、誤公開、権限変更時に、Production停止時間を最小化してGoogle API keyを差し替えるための手順。

対象:

- Maps Grounding Lite API
- Places API (New)
- Cloudflare Pages Secret `MAPS_GROUNDING_API_KEY`
- GitHub Actions Secret `MAPS_GROUNDING_API_KEY`

## 2. 原則

- 旧keyを先に削除しない
- 新keyを作成し、同じAPI restrictionsを設定してから切り替える
- Browser、Repository、Issue、PR、Actions logへkey値を出さない
- Production確認後に旧keyを無効化・削除する
- 異常利用中は必要に応じてRate Limiter値を一時的に下げる

## 3. 通常Rotation

### Step 1: 新しいGoogle API keyを作成

Google Cloud Consoleで新しいAPI keyを作成する。

必須API restrictions:

- Maps Grounding Lite API
- Places API (New)

Application restrictionsは現在のCloudflare Pages Functions構成では設定しない。

### Step 2: GitHub Actions Secretを更新

Repository:

`ha-rookie/omoi-no-hougaku`

Secret:

`MAPS_GROUNDING_API_KEY`

新keyへ置き換える。

Secret値をIssue/PR/commitへ貼らない。

### Step 3: Production Deploy

`Deploy PoC to Cloudflare Pages` をmainで実行する。

WorkflowがGitHub Actions SecretからCloudflare Pages Secretへ同期する。

### Step 4: Smoke test確認

少なくとも以下を確認する。

- Production deploy成功
- build SHA一致
- OriginなしPOST → 403 / `ORIGIN_REQUIRED`
- same-origin + 空入力 → 400 / `URL_REQUIRED`
- 実際のGoogle Maps共有から地点解決できることを1回確認

### Step 5: 旧keyを無効化

新keyでProduction動作確認後、Google Cloud側で旧keyを無効化する。

問題がないことを確認後、旧keyを削除する。

## 4. 緊急Rotation

漏えいが強く疑われる場合:

1. Rate Limiterを必要に応じて一時的に引き下げる
2. 新keyを作成し、API restrictionsを設定
3. GitHub Actions Secretを更新
4. Production deploy
5. Production確認
6. 旧keyを即時無効化
7. GitHub commit / Issue / PR / Actions logにkey値が残っていないか再確認

旧keyの削除よりも、まず無効化を優先する。

## 5. 現在の防御

Rotationとは別に、通常時は以下でabuseを抑制する。

- API keyはBrowser非公開
- API restrictionsは必要な2 APIのみ
- Origin必須 + same-origin
- Fetch Metadata検証
- Private Rate Limiter Worker
- 30 requests / 60 seconds
- Rate Limiter障害時はfail closed
- main Ruleset + required checks

## 6. 完了記録

Rotationを実施した場合は、key値を書かずに以下だけIssueまたは運用記録へ残す。

- Rotation実施日時
- 理由
- 新keyの制限確認済みか
- Production deploy run ID
- smoke test結果
- 旧key無効化済みか
