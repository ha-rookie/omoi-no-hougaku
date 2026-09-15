# Project Overview

## Project

想いの方角（omoi-no-hougaku）

大切な人、故郷、思い出の場所、祈りたい場所など「自分にとって意味のある場所」の方角を、静かに向くためのWebアプリ。

## User Problem

遠く離れた大切な人や場所を思うとき、「どちらを向けばよいか」を簡単に知る手段がない。

一般的な地図アプリは場所を探すことには強いが、登録した大切な場所を選び、その方角へ身体を向けるという体験には特化していない。

また、本アプリで扱う対象はセンシティブになり得るため、SNS的な共有、ランキング、他人からの評価を前提にしない。

## Target User

- 遠く離れた家族や大切な人のいる方向を向きたい人
- 故郷や思い出の場所を静かに思いたい人
- 神社、墓所など特定の場所へ向かって祈りたい人
- 自分の想いを他人と共有せず、個人的に使いたい人
- 日本国内だけでなく海外の場所も登録したい人

## Success Condition

MVPでは以下を満たせば成功とする。

1. ユーザーがGoogle Mapsで見つけた地点を「共有 → 想いの方角」で登録できる
2. 任意ピンはGoogle APIへ送らず、共有titleの正確な緯度経度を利用できる
3. 名称付き施設は必要時だけGoogle公式APIで座標へ解決できる
4. 登録した地点を最大5か所まで端末内へ保存できる
5. 登録地点を選ぶと、現在地から見た方角を表示できる
6. 端末の向きと目的地の方向関係をスマートフォン上で理解できる
7. 登録地点や表示名をサーバーDBへ保存しない

## In Scope

- Android Google MapsからPWA Web Share Targetへの地点共有
- 任意ピン共有titleの緯度・経度検証と直接採用
- 名称付き施設のMaps Grounding Lite + Places API (New)による座標解決
- 地点への任意の表示名設定
- 最大5地点のlocalStorage保存
- 登録地点の一覧、選択、削除
- 現在地取得
- 現在地から目的地までの方位角計算
- Device Orientationを利用した方角UI
- スマートフォン中心のレスポンシブUI
- PWA
- Cloudflare Pages + Pages Functionsへの公開

## Out of Scope

- SNS共有、いいね、フォロー、ランキング
- 他ユーザーとの位置共有
- 人名、電話番号、SNSアカウントからの現在地検索
- 登録地点のサーバーDB保存
- ログイン、アカウント管理
- 複数端末同期
- Google Maps地図UIのアプリ内埋め込み
- 無制限の場所コレクション
- 他人の現在位置の追跡

## Technology

- Frontend: HTML / CSS / JavaScript ES Modules
- Runtime: Android Chrome/PWAを主要対象とするWeb Runtime
- Hosting: Cloudflare Pages + Pages Functions
- Data Store: Browser localStorage（MVP）
- External Map: Google Mapsは地点探索・共有元として利用する
- External APIs: 名称付き施設の登録時のみMaps Grounding Lite + Places API (New)
- Secrets: Google API keyはCloudflare Secretで管理しBrowserへ露出しない
- Repository: `ha-rookie/omoi-no-hougaku`

## Product Principles

- 「場所を探す」より「その場所を向く」ことを中心価値にする
- 必要以上にユーザーの想いを収集しない
- 誰を想っているかをサービス側で知る必要のない設計を優先する
- 任意ピンは可能な限り端末内で処理する
- 機能追加よりも、静かで邪魔をしない体験を優先する
- 失敗時に推測した地点を登録せず、読み取り失敗を明示する

## Human Decision Points

- プロダクトの言葉遣いとセンシティブさ
- UIの違和感と受容性
- 位置情報許可の説明文
- Google API利用量・課金設定・予算アラート
- Web Share Target非対応環境のfallback
- Production release
- 重要なmerge
- Asset最終承認

## Release Definition of Done

Use [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).
