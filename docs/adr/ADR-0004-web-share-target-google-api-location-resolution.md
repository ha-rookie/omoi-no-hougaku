# ADR-0004: Web Share Targetと2経路の地点解決をMVP主導線とする

- Status: Accepted
- Date: 2026-09-15
- Related: Issue #18, #20, #22, #25, #27, #29
- Supersedes: ADR-0001, ADR-0003

## Context

「想いの方角」はGoogle Mapsで見つけた場所を少ない操作で登録し、その方角を向くことを中心体験とする。

当初はGoogle Maps Platform APIを使わず、共有短縮URLをClientまたはCloudflare Pages Functionで展開して座標を得る方針だった。しかし実機PoCで以下が確認された。

- Android Chromeから`maps.app.goo.gl`をClient-onlyでfetchすると`Failed to fetch`となる
- Cloudflare Pages FunctionでGoogle通常redirectを追う方式は`www.google.com/sorry`へ遷移し、安定した主導線にできない
- Google Maps Androidからインストール済みPWAへWeb Share Targetで共有できる
- 任意ピンでは共有`title`に`34.950599,136.767197`のような緯度経度が入る
- 任意ピンの`title`座標は元ピンと一致し、外部APIを呼ばず確定できる
- 名称付き施設では共有`text`に`https://maps.app.goo.gl/...`が入り、Maps Grounding Lite `ResolveMapsUrls`でPlace IDを取得できる
- Places API (New)でPlace IDから緯度経度を取得できる
- 任意ピンの短縮URLをPlace ID経由で座標化すると元ピンから数kmずれるケースがあり、任意ピンに施設解決経路を適用してはいけない

## Decision

MVPの地点登録主導線を以下にする。

```text
Google Mapsで地点を選ぶ
  -> 共有
  -> 想いの方角
  -> Web Share Targetがtitle/text/urlを受信
       |
       +-- titleが厳密なlat,lng
       |     -> 範囲検証
       |     -> 端末内でその座標を採用
       |     -> Google APIを呼ばない
       |
       +-- titleが座標ではない
             -> text/urlからmaps.app.goo.glを抽出
             -> same-origin POST /api/resolve-location
             -> Maps Grounding Lite ResolveMapsUrls
             -> Place ID
             -> Places API (New) id/location
             -> 座標を返す
```

追加ルール:

- 任意ピンの`title`座標が有効なら共有URLをServerへ送らない
- 任意ピンで`title`座標が不正/欠落した場合、短縮URLから近隣Placeを推測して登録しない
- 名称付き施設の共有URLだけ必要時にServerへ送る
- API keyはCloudflare Secretで管理しBrowserへ露出しない
- Pages FunctionはDB/KV/D1へ地点情報を保存しない
- 共有URL、Place ID、座標をApplication log/Analyticsへ出さない
- Places API (New)は必要最小フィールドだけ要求する
- 保存後は表示名・緯度・経度・作成時刻等の最小情報だけlocalStorageへ保持する
- Google APIは新規名称付き施設の登録時だけ利用し、保存済み地点表示・方位計算では利用しない

## Privacy Trade-off

完全なClient-only方式ではない。名称付き施設を登録する場合、Google Maps共有URLはCloudflare Pages Functionを経由しGoogle APIへ送信される。

一方、任意ピンは共有title座標を端末内で確定できるためServerへ送らない。墓所、思い出の場所、海上等のセンシティブな任意地点で外部送信を減らせる。

登録後の表示名・座標はサーバーDBへ保存しない。

## Cost Trade-off

Google APIを利用するため従量課金の可能性がある。価格、無料利用枠、クレジットは変更され得るため固定金額を設計前提にしない。

コスト抑制策:

- 任意ピンではAPIを呼ばない
- 名称付き施設の新規登録時だけ呼ぶ
- Places APIは`id/location`のみ取得する
- 保存済み地点閲覧・方位計算でAPIを呼ばない
- Production release前にGoogle Cloudの利用量・課金設定・予算アラートを人間が確認する

## Security

- Web Share TargetのPOSTはService Workerで受け、共有本文をURL queryへ載せない
- `title/text/url`の型・長さ・形式をClientで検証する
- Serverへ送信可能なURLはexact `https://maps.app.goo.gl/...`に限定する
- Pages Functionからの外部接続先は固定Google API endpointに限定する
- API keyをRepository、HTML、Browser JSへ含めない
- Browser Originが存在する場合はsame-originのみ許可する
- Responseは`Cache-Control: no-store`
- エラー時に入力URL・座標をResponse/logへ含めない

## Consequences

### Positive

- ユーザー操作を「Google Mapsで選ぶ → 共有 → 想いの方角」に統一できる
- 任意ピンは正確な座標をAPIなしで取得できる
- 名称付き施設はGoogle公式APIで解決できる
- Google Mapsの非公開redirect URL内部形式を解析しなくてよい
- 登録地点・表示名はlocal-onlyのまま維持できる

### Negative

- Android/PWA/Web Share Targetへの依存がMVPで強くなる
- 名称付き施設の登録はGoogle APIとCloudflare Pages Functionに依存する
- API key・課金・利用制限の運用が必要になる
- Web Share Target非対応環境のfallback UXは別途必要になる可能性がある

## Rejected / Replaced Alternatives

### Client-only短縮URL展開

Android Chromeで`Failed to fetch`。主導線として不成立。

### Pages Functionで通常redirectを追跡

Google側`/sorry`へ遷移。CAPTCHA/anti-bot回避は行わず不採用。

### Plus Code復元

Androidでは地域名付き短縮Plus Codeとなり、全世界の基準地点を持つ問題が残る。Web Share Targetでより単純な経路が成立したため主導線から外す。

### 任意ピンもPlace ID経由で解決

元ピンと異なる近隣Place座標が返る実機ケースを確認したため禁止する。

## Validation

PoC #25で以下をAndroid実機確認済み。

- 任意ピン: `method=shared-title-coordinate`, `apiCalled=false`、共有元座標と一致
- 名称付き施設: `method=maps-url-api`, `apiCalled=true`、Place IDと緯度経度取得成功
- Share TargetのService Worker未登録でHTTP 405となった問題は#27で修正し再確認済み

人間承認を受け、本ADRをAcceptedとする。PoCコードを直接importせず、本番`public/` / `functions/`へ移植する。
