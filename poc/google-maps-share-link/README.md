# Google Maps共有リンク PoC

Issue #2 の技術検証用です。本番UIではありません。

## 目的

Google Maps Platform APIを使わず、ユーザーがGoogle Mapsから取得した共有リンクを「想いの方角」へ渡したときに、登録地点として信頼できる緯度・経度を取得できるか確認します。

## 方針

- Google Maps APIは使わない
- Google Maps以外のURLは拒否する
- 緯度は -90〜90、経度は -180〜180 を検証する
- `!3d<lat>!4d<lng>` をPlace詳細座標として最優先する
- `query` / `q` / `destination` が緯度経度そのものの場合は採用する
- `@<lat>,<lng>` は地図の表示中心になり得るため、登録地点として採用しない
- 解析できない場合は推測座標を返さない
- `maps.app.goo.gl` 短縮URLはブラウザの `fetch` でリダイレクト先取得を試す
- CORS等で短縮URLを解決できない場合は `SHORT_URL_BROWSER_BLOCKED` として明示する

## 実行

ローカルで静的HTTPサーバーを起動し、`index.html` をブラウザで開きます。

```bash
python -m http.server 8000
```

例: `http://localhost:8000/poc/google-maps-share-link/`

## 自動テスト

Node.jsの標準機能だけで実行できます。

```bash
node poc/google-maps-share-link/resolver.test.mjs
```

以下を確認します。

- 緯度経度の直接入力
- `!3d...!4d...` の抽出
- Maps URLの `query=lat,lng` 抽出
- viewport座標 `@lat,lng` の拒否
- Google以外のURLの拒否
- Google風の偽装ホストの拒否
- 座標範囲チェック
- 短縮URLが最終URLへ解決できた場合の解析
- ブラウザ解決失敗時の明示エラー

## 実機確認が必要な項目

`maps.app.goo.gl` の実URLについては、Android Chrome等の実ブラウザで以下を確認します。

1. Google Mapsで任意地点を開く
2. 「共有」→「リンクをコピー」
3. PoC画面へ貼り付ける
4. 「地点を読み取る」
5. 成功時は緯度経度と `sourceType` を記録する
6. 失敗時はエラーコードを記録する

短縮URLのリダイレクト取得がCORSで阻止される場合、Client-only方式は不成立と判断します。Worker等のサーバー解決方式へ進むかは、地点URLをサーバー送信するプライバシー影響を含めて別途人間判断します。

## 公式仕様との境界

Googleが公式に文書化しているMaps URLsは、Google Mapsを起動して検索・経路・地図表示等を行うための仕組みです。APIキーなしで利用できます。

https://developers.google.com/maps/documentation/urls/get-started

一方、`maps.app.goo.gl` の共有短縮URLを「座標取得API」として扱う仕様は、このPoCでは前提にしません。実測で成立しても、内部URL形式への依存度を評価します。
