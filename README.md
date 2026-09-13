# 想いの方角

大切な人、故郷、思い出の場所、祈りたい場所など、自分にとって意味のある場所の方角を静かに向くためのWebアプリです。

## コンセプト

このアプリは、場所を集めたり、人と共有したりするためのものではありません。

「いま自分がいる場所から、大切な場所はどちらにあるのか」を知り、その方向へ身体を向けるための小さな道具を目指します。

- SNS共有を前提にしない
- いいね、フォロー、ランキングを作らない
- 登録地点は最大5か所
- 登録地点・表示名はMVPでは端末内だけに保存する
- Google Maps APIはMVPでは使わない
- 国内・海外の地点を同じ考え方で扱う

## MVPの基本フロー

```text
Google Mapsで場所を探す
  -> 共有リンク等を「想いの方角」へ渡す
  -> 地点を読み取る
  -> 本人だけが分かる名前を付ける
  -> 最大5か所を端末内へ保存
  -> 保存地点を選ぶ
  -> 現在地から方角を計算
  -> スマートフォンをその方向へ向ける
```

Google Mapsの短縮共有URLから緯度・経度を安定して取得できるかは、最初のPoCで検証します。失敗時に推測座標を登録しないことを要件とします。

## 設計方針

詳細は以下を正本とします。

- [Project Overview](docs/00_PROJECT_OVERVIEW.md)
- [Requirements](docs/01_REQUIREMENTS.md)
- [System Architecture](docs/02_SYSTEM_ARCHITECTURE.md)
- [Application Architecture](docs/03_APPLICATION_ARCHITECTURE.md)
- [Design Documentation Index](docs/README.md)
- [Architecture Decision Records](docs/adr/README.md)

主な初期判断:

- [ADR-0001: MVPではGoogle Maps APIを組み込まない](docs/adr/ADR-0001-google-maps-api-not-used-for-mvp.md)
- [ADR-0002: 保存先は端末内のみ、最大5か所とする](docs/adr/ADR-0002-local-only-five-places.md)

## 開発のGolden Path

設計変更 → 設計書 → Issue → Branch → 実装 → Test → Pull Request → Preview実機確認 → Human approval → Merge → Production

原則としてmainを直接変更せず、1 Issue・1 Branch・1 Pull Requestで進めます。

## Repository

`ha-rookie/omoi-no-hougaku`
