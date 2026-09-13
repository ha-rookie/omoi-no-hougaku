# Asset Workflow

## 標準フロー

画像要件 → 生成プロンプト → 画像生成 → 人間確認 → Design Preview → スマホ確認 → 承認head SHA → 本番配置 → CI → App Preview

## 仕様として残すもの

用途、表示サイズ、元サイズ、縦横比、透過、背景、向き、余白、形式、圧縮、alt・aria、ファイル名、生成プロンプト、禁止要素。

## 保存

- `assets/prompts/`: 再生成用プロンプト
- `docs/design/assets/`: レビュー中
- `public/assets/`: 承認済み本番Asset

## 実装Issueへの引き継ぎ

Design承認後、実装Issueの `Asset Handoff` に固定情報を残す。

最低限、以下を引き継ぐ。

- 元Design Issue/PR
- 承認済みAsset一覧
- Asset配置場所
- file hash または承認head SHA
- 承認Preview

Assetを使わないIssueは `該当なし` とする。

承認済みAssetは、実装側が再生成、色変更、トリミング、差し替えをしない。変更が必要ならDesign Issueへ戻し、再承認後に新しいhashまたはhead SHAを実装Issueへ引き継ぐ。

## 承認後

実装側は承認済みAssetを再利用する。独断で再生成、色変更、トリミング、差し替えをしない。変更が必要ならDesign Issueへ戻す。

## テスト

ファイル欠落、形式、サイズ、透過、参照パス、キャッシュ、スマホ、小サイズ、背景とのコントラスト、PWA対象範囲を確認する。
