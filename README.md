# 想いの方角

大切な人、故郷、思い出の場所、祈りたい場所など、自分にとって意味のある場所の方角を静かに向くためのWebアプリです。

## コンセプト

このアプリは、場所を集めたり、人と共有したりするためのものではありません。

「いま自分がいる場所から、大切な場所はどちらにあるのか」を知り、その方向へ身体を向けるための小さな道具を目指します。

- SNS共有を前提にしない
- いいね、フォロー、ランキングを作らない
- 登録地点は最大5か所
- 登録地点・表示名はMVPでは端末内だけに保存する
- 地点探索はGoogle Mapsへ任せる
- 任意ピンは可能な限り端末内で処理する
- 国内・海外の地点を同じ考え方で扱う

## MVPの基本フロー

```text
Google Mapsで場所を探す
  -> 共有
  -> 「想いの方角」を選ぶ
  -> 任意ピンなら共有titleの緯度経度を直接採用
  -> 名称付き施設ならGoogle公式APIで座標へ解決
  -> 本人だけが分かる名前を付ける
  -> 最大5か所を端末内へ保存
  -> 保存地点を選ぶ
  -> 現在地から方角を計算
  -> スマートフォンをその方向へ向ける
```

任意ピンで共有titleが有効な緯度経度ならGoogle APIを呼びません。名称付き施設だけ、Cloudflare Pages FunctionからMaps Grounding Lite + Places API (New)を利用します。API keyはCloudflare Secretで管理しBrowserへ露出しません。

地点を確定できない場合は推測座標を登録しません。

## 設計方針

詳細は以下を正本とします。

- [Project Overview](docs/00_PROJECT_OVERVIEW.md)
- [Requirements](docs/01_REQUIREMENTS.md)
- [System Architecture](docs/02_SYSTEM_ARCHITECTURE.md)
- [Application Architecture](docs/03_APPLICATION_ARCHITECTURE.md)
- [Design Documentation Index](docs/README.md)
- [Architecture Decision Records](docs/adr/README.md)

主な判断:

- [ADR-0002: 保存先は端末内のみ、最大5か所とする](docs/adr/ADR-0002-local-only-five-places.md)
- [ADR-0004: Web Share Targetと2経路の地点解決をMVP主導線とする](docs/adr/ADR-0004-web-share-target-google-api-location-resolution.md)

ADR-0001 / ADR-0003はPoC結果によりADR-0004へ置き換えます。

## 開発のGolden Path

設計変更 → 設計書 → Issue → Branch → 実装 → Test → Pull Request → Preview実機確認 → Human approval → Merge → Production

原則としてmainを直接変更せず、1 Issue・1 Branch・1 Pull Requestで進めます。

## Repository

`ha-rookie/omoi-no-hougaku`
