# Public Release Checklist

GitHub RepositoryをPrivateからPublicへ変更する前後の確認手順。

## 1. Public化前

### Repository / Secret

- [x] Google API keyはRepositoryへ置かず、`MAPS_GROUNDING_API_KEY` Secretで管理する設計
- [x] Cloudflare API token / Account IDはGitHub Actions Secretsで管理
- [x] PR向けWorkflowはSecretsを参照しない
- [x] Deploy Workflowは`push: main` / `workflow_dispatch`のみでSecretを利用
- [x] 2026-09-21時点のmain 65 commitsを代表的なSecretパターンで履歴走査し、該当なし
- [ ] GitHub上のSecret scanning / 公開前レビューで追加確認
- [ ] Issue / PR本文にSecret値が貼られていないことを人間確認

履歴走査で確認した代表パターン:

- Google API key形式（`AIza...`）
- `MAPS_GROUNDING_API_KEY`への長いliteral代入
- `CLOUDFLARE_API_TOKEN`への長いliteral代入
- Bearer token形式
- Private key header

この走査は既知パターンの確認であり、非標準形式の秘密情報まで完全に保証するものではない。

### API hardening

- [x] API POSTはOrigin必須
- [x] OriginはRequest URLとsame-origin必須
- [x] `Sec-Fetch-Site`が存在する場合は`same-origin`のみ許可
- [x] `Cross-Origin-Resource-Policy: same-origin`
- [x] `Cache-Control: no-store`
- [x] URL host / body size / content typeを検証
- [x] Google API keyをBrowser / Responseへ返さない
- [x] 任意hostへの汎用proxyにしない

注意: Origin / Fetch Metadataはブラウザ経由の不正利用を減らす防御であり、認証ではない。curl等はヘッダーを偽装できるため、匿名公開APIのabuse耐性はCloudflare/Google Cloud側の制限と組み合わせる。

### Google Cloud

- [x] API keyのAPI restrictionsがMaps Grounding Lite + Places API (New)だけになっている
- [x] 不要APIがAPI key restrictionsに含まれていない
- [x] Maps Grounding Liteのquotaを確認（Resolve Maps URLs: 600 requests/minute）
- [x] Google Cloud側quotaを現状のConsoleでは引き下げられないことを確認
- [x] budget alertは今回は採用しない（即時対応できない通知よりCloudflare側自動遮断を優先）
- [x] 異常利用時のkey rotation手順を `API_KEY_ROTATION_RUNBOOK.md` に整理

Google側のquotaを直接引き下げる代わりに、Cloudflareで30 requests / 60 secondsのRate LimitをGoogle API前段へ実装する。

### Cloudflare

- [x] Pages projectのProduction Secret `MAPS_GROUNDING_API_KEY` が存在する
- [ ] PreviewでSecretを使う必要性を確認
- [x] API abuse対策としてPrivate Rate Limiter Worker + Rate Limiting bindingを導入
- [x] Pages productionからService binding `RATE_LIMITER_SERVICE` で内部接続
- [x] Rate Limitは30 requests / 60 seconds
- [x] Rate Limiter Workerの `workers.dev` / preview URLは無効
- [ ] Functions利用量を確認
- [x] Fail closed方針を採用（Rate Limiter不在・障害時は503でGoogle APIへ進まない）

Service bindingはGitHub ActionsがCloudflare Pages Project APIで自動設定・検証する。Cloudflare Dashboardでの手動設定は不要。

## 2. Merge

- [x] Public化前Security hardening PR #35をMerge
- [x] Public化後にPR向けRequired checksを復旧・成功確認
- [x] main Rulesetを有効化し、PR + required checksを必須化
- [x] Rate Limiter導入PR #43 / #44 / #45 / #46をRequired checks成功後にMerge
- [x] Production deploy / smoke test成功を確認

現在のmainはRulesetで直接変更を防ぎ、`validate` と `google-maps-share-link` の両Required checkを通してからMergeする。

## 3. Public化

- [x] Repository SettingsでPrivate → Publicを実施（2026-09-21）
- [x] Public化後、Repository / Issues / PR / commit historyが第三者から閲覧可能であることを確認
- [ ] Actions Secretsの値が表示されていないことを人間確認
- [x] main Ruleset / PR設定を確認
- [x] mainへのforce push / deleteを禁止
- [x] required status checksを設定（`validate`, `google-maps-share-link`）
- [x] Ruleset bypassなし
- [x] forkイベント監視Workflowを導入

Public化は「ソース閲覧・clone・fork・PR送信」を許可する。第三者へmain push権限、Actions Secrets、Cloudflare管理権限を与える操作ではない。

## 4. Public化直後のDeploy

- [x] Public化後にGitHub Actionsを再実行
- [x] Production Deploy成功
- [x] smoke test成功
- [x] OriginなしAPI POST → 403 / `ORIGIN_REQUIRED`
- [x] same-origin + 空入力 → 400 / `URL_REQUIRED`
- [x] build SHAがmainのMerge SHAと一致
- [x] Rate Limiter Worker Deploy成功
- [x] Pages Service binding自動設定成功

## 5. Production確認

- [x] `https://omoi-no-hougaku.pages.dev/` がProduction smoke testで応答する
- [ ] Android Chromeで主要PoCを人間確認
- [ ] Google Maps共有から地点解決できることを人間確認
- [x] Originなし要求が403になる
- [ ] Google Cloud usageに異常な増加がないことを継続確認
- [ ] Cloudflare Functions / Worker usageに異常な増加がないことを継続確認

## 6. 残余リスク

Public RepositoryかPrivate Repositoryかにかかわらず、公開Web/APIは外部から観察・試行できる。

Public化により攻撃者が実装詳細を理解しやすくなる一方、Secret値や管理権限まで公開されるわけではない。したがって安全性は「URLやソースを隠す」ことではなく、Secret分離、入力境界、最小権限、quota、rate limiting、監視で維持する。


## 7. 2026-09-22 Security hardening state

- Google API key: Browser非公開 / Cloudflare Pages Secret
- API restrictions: Maps Grounding Lite + Places API (New)のみ
- Browser request: Origin必須 + same-origin + Fetch Metadata
- Resolver input: exact Google Maps short URL host / JSON / body size制限
- Cloudflare Rate Limiter Worker: private
- Rate Limit: 30 requests / 60 seconds / Cloudflare location
- Pages → Worker: Service binding
- Rate Limiter障害時: fail closed (503)
- Rate Limit超過時: 429
- Ruleset: active / bypassなし / PR required
- Fork monitor: enabled
- 最終Production deploy確認: success
