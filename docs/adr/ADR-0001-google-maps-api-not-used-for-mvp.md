# ADR-0001: MVPではGoogle Maps APIを組み込まない

## Status

Proposed

## Context

「想いの方角」は、大切な人・場所・故郷・思い出の場所などの方向を静かに向くためのWebアプリである。

地点登録のためにGoogle Maps Platformを組み込む案も検討したが、本アプリの中心価値は地図検索ではなく「登録した場所の方角を向く体験」にある。

また、Google Maps APIを組み込む場合はAPIキー、課金設定、利用制限、地図UI、Places API等の管理が必要になる。

一方、Google Mapsの共有リンクを利用すれば、ユーザーは普段使っているGoogle Mapsで国内外の場所を探せる可能性がある。

## Decision

MVPではGoogle Maps APIを組み込まない。

地点登録は以下を基本フローとする。

1. Google Mapsで場所を探す
2. Google Mapsの共有リンクを取得する
3. 「想いの方角」に共有リンクを貼り付ける
4. アプリ側で共有リンクから地点情報を読み取る
5. 読み取れた緯度・経度をユーザーが確認して登録する

共有リンクから緯度・経度を安定して取得できるかはPoCで検証する。

将来的にAndroid PWAのWeb Share Target APIで共有先に「想いの方角」を出せるかも検討する。

## Consequences

### Positive

- Google Maps APIキーが不要
- API課金を避けられる
- 国内・海外を同じ操作で扱いやすい
- 地図UIの実装を持たなくてよい
- アプリの責務を「方角を向く」に集中できる

### Negative

- Google Maps共有URLの形式変更に影響を受ける可能性がある
- 短縮URL展開やURL解析方法のPoCが必要
- Google公式の位置取得APIとして保証されたインターフェースではないため、失敗時の代替手段が必要

## Alternatives Considered

### Google Maps Platformをアプリ内へ組み込む

UXは良いが、MVPとしては実装・運用負荷が大きい。

### 緯度経度をユーザーに直接コピーしてもらう

Google Maps Android版では緯度経度のコピー方法が直感的でなく、ユーザー操作として分かりにくいため採用しない。

### 日本国内の市区町村マスタを保持する

海外利用を想定しており、国・地域ごとのマスタ管理が必要になるため採用しない。

## Validation

PoCで以下のGoogle Maps共有リンクを検証する。

- 市区町村
- 国内住所
- 海外住所
- 有名施設
- 店舗・病院等の施設
- 任意地点

少なくとも主要パターンで緯度・経度を取得でき、取得失敗時に明示的なエラーを返せることを確認する。
