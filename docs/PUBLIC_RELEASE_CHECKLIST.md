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

- [ ] API keyのAPI restrictionsがMaps Grounding Lite + Places API (New)だけになっている
- [ ] 不要APIが許可されていない
- [ ] quota / usage上限を確認
- [ ] budget alertを確認
- [ ] 異常利用時のkey rotation手順を確認

### Cloudflare

- [ ] Pages projectのProduction Secretが存在する
- [ ] PreviewでSecretを使う必要性を確認
- [ ] API abuse対策としてrate limiting / challengeの適用可否を確認
- [ ] Functions利用量を確認
- [ ] Fail open / closed方針を確認

## 2. Merge

- [ ] Security PRの差分を人間確認
- [ ] CIがActions quotaで実行不能の場合、その事実をPRに残す
- [ ] mainへ手動Merge
- [ ] Merge SHAを記録

Private状態でActions無料枠が尽きている場合、Merge時のDeploy失敗/未実行は想定内。Public化後に同じmain SHAを手動Deployする。

## 3. Public化

- [ ] Repository SettingsでPrivate → Publicを実施
- [ ] Public化後、Repository / Issues / PR / commit historyが第三者から閲覧可能であることを理解する
- [ ] Actions Secretsの値が表示されていないことを確認
- [ ] Branch protection / PR設定を確認
- [ ] 不要な書き込み権限を付与しない

Public化は「ソース閲覧・clone・fork・PR送信」を許可する。第三者へmain push権限、Actions Secrets、Cloudflare管理権限を与える操作ではない。

## 4. Public化直後のDeploy

1. Actionsを開く
2. `Deploy PoC to Cloudflare Pages` を選ぶ
3. `Run workflow` をmainに対して実行
4. Deploy完了を確認
5. smoke test完了を確認

smoke testでは少なくとも以下を確認する。

- OriginなしAPI POST → 403 / `ORIGIN_REQUIRED`
- same-origin + 空入力 → 400 / `URL_REQUIRED`
- build SHAがmainのMerge SHAと一致

## 5. Production確認

- [ ] `https://omoi-no-hougaku.pages.dev/` が表示できる
- [ ] Android Chromeで主要PoCを確認
- [ ] Google Maps共有から地点解決できる
- [ ] cross-origin要求が403になる
- [ ] Google Cloud usageに異常な増加がない
- [ ] Cloudflare Functions usageに異常な増加がない

## 6. 残余リスク

Public RepositoryかPrivate Repositoryかにかかわらず、公開Web/APIは外部から観察・試行できる。

Public化により攻撃者が実装詳細を理解しやすくなる一方、Secret値や管理権限まで公開されるわけではない。したがって安全性は「URLやソースを隠す」ことではなく、Secret分離、入力境界、最小権限、quota、rate limiting、監視で維持する。
