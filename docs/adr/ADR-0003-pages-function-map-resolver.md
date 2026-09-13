# ADR-0003: Google Maps短縮URLはPages Functionで一時展開する

- Status: Accepted
- Date: 2026-09-13
- Related: Issue #2, Issue #14

## Context

Android Chrome実機PoCで `https://maps.app.goo.gl/...` をブラウザから直接 `fetch` すると `Failed to fetch` となり、Client-onlyで短縮URLのredirect先を取得する方式は主導線として成立しなかった。

一方、Google Maps API / Places APIはMVPで利用せず、地点探索はGoogle Mapsアプリ側へ任せる方針を維持したい。

Cloudflare PagesのDirect UploadをWranglerから行う構成では、Repository rootの `/functions` をPages Functionsとして同時Deployできる。Pages FunctionsはファイルベースRoutingを利用できるため、短縮URL展開だけの最小Endpointを追加できる。

## Decision

`POST /api/resolve-map` をCloudflare Pages Functionとして追加する。

- 入力は `https://maps.app.goo.gl/...` の短縮共有URLのみ
- Functionがredirectを `manual` で追跡する
- 各redirect先でHTTPSと許可hostを検証する
- Google Maps以外のhostへは接続しない
- redirect回数に上限を設ける
- 確実に確認できる緯度・経度だけ返す
- `@lat,lng` の表示中心だけの場合は地点として採用しない
- Request URL、地点名、座標をDBへ保存しない
- Application logへ入力URLや座標を出力しない
- Responseは `Cache-Control: no-store`
- Google Maps Platform / Places APIは利用しない

## Privacy Trade-off

短縮URLは展開処理の間だけブラウザからCloudflare Pages Functionへ送信される。完全なClient-onlyではないため、サーバー処理を一切行わない設計よりPrivacy boundaryは広がる。

ただし、ログ出力・DB保存・Analytics送信を行わず、Endpoint用途を短縮URL展開に限定することで収集範囲を最小化する。

このTrade-offは、Android実機でClient-only方式が不成立だったことを確認した後、人間承認を得て採用した。

## Security

- SSRF対策として入力hostを `maps.app.goo.gl` に限定する
- redirect先もGoogle Maps用allowlistで検証する
- `https:` 以外を拒否する
- body size、URL length、redirect countを制限する
- cross-origin browser requestはOriginがある場合にsame-originのみ許可する
- Error responseへ入力URLを含めない

## Consequences

### Positive

- Google Maps API keyや課金設定が不要
- Google Maps側で地点を探すUXを維持できる
- 登録地点そのものはlocalStorageへ保存できる
- Resolver障害時も保存済み地点の方角表示には影響しない

### Negative

- 新規地点登録時はCloudflare Pages Functionへ通信が必要
- Google Maps共有URLの非公開内部形式に一部依存する
- Google側のredirect形式変更でResolverが失敗する可能性がある

## Rejected Alternatives

### Client-only fetch

Android Chrome実機で `Failed to fetch` となったため主導線として不採用。

### Google Maps Platform / Places API

MVP方針で不採用。API key、利用設定、費用管理を増やさずに成立させる。

### 緯度経度の手入力のみ

API不要で堅牢だが、Android版Google Mapsで座標コピーが直感的ではなく、主導線としての操作負荷が高いためfallback候補に留める。
