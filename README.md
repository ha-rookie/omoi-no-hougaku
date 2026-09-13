# AI Driven Web App Template

AIと人間でWebアプリを継続開発するための標準テンプレートです。

コードの雛形だけでなく、設計、Issue、Branch、Pull Request、CI、Cloudflare、Asset、Security、SEO、リリース、振り返りまでを一つのGolden Pathとして管理します。

## 基本原則

1. 設計変更 → 設計書 → Issue → 実装 → テスト → Pull Request
2. 1 Issue・1 Branch・1 Pull Request
3. mainを直接変更しない
4. 通常PR＋人間承認ゲートを標準とする
5. Previewでスマホ確認してからProductionへ反映する
6. ProductionとPreviewのデータ・Bindingsを分離する
7. 失敗をKnown Issue、手順、テンプレート、CIへ順に昇格する
8. GitHubのmainを承認済み設計の正本とする
9. 設計書ごとの責務を分け、同じ事実を複数文書へ重複管理しない

## Golden Path

アイデア → 企画 → 要件 → Architecture → UI設計 → Issue → Branch → 実装 → CI → Preview → 人間レビュー → Merge → Production → SEO・Security・Analytics確認 → 振り返り

## 使い始めるとき

- `docs/00_PROJECT_OVERVIEW.md` のCHANGE-MEを置き換える
- `docs/01_REQUIREMENTS.md` に機能・非機能要件を定義する
- `docs/02_SYSTEM_ARCHITECTURE.md` でHosting、外部Service、データ経路、環境分離を設計する
- `docs/03_APPLICATION_ARCHITECTURE.md` でModule責務、State、Data、IFを設計する
- `docs/04_REPOSITORY_STRUCTURE.md` を実際のRepository treeへ合わせる
- 重要な技術判断は `docs/adr/` に残す
- UIの認識差が出る場合は `docs/design/` でVisual Designを作る
- CloudflareのHello World Deployを先に通す
- 必要なIssueをテンプレートから作る
- Release Checklistをプロジェクトに合わせて更新する

## 設計書の管理

設計書の入口は [Design Documentation Index](docs/README.md) とする。

- 承認済み最新設計: GitHub `main`
- 提案中設計: PR Branch
- 視覚レビュー: `docs/design/` + 必要に応じDesign Preview
- 設計判断履歴: `docs/adr/`
- 構築キャプチャー・外部資料: Google Drive
- Chat上の確定事項: 必ず該当設計書へ反映

詳細は [Design Management](docs/05_DESIGN_MANAGEMENT.md) を参照する。

## 文書

### Core Design

- [Design Documentation Index](docs/README.md)
- [Project Overview](docs/00_PROJECT_OVERVIEW.md)
- [Requirements](docs/01_REQUIREMENTS.md)
- [System Architecture](docs/02_SYSTEM_ARCHITECTURE.md)
- [Application Architecture](docs/03_APPLICATION_ARCHITECTURE.md)
- [Repository Structure](docs/04_REPOSITORY_STRUCTURE.md)
- [Design Management](docs/05_DESIGN_MANAGEMENT.md)
- [Requirements Traceability](docs/06_REQUIREMENTS_TRACEABILITY.md)
- [Visual Design](docs/design/README.md)
- [Architecture Decision Records](docs/adr/README.md)

### Development / Operations

- [Git Workflow](docs/GIT_WORKFLOW.md)
- [Asset Workflow](docs/ASSET_WORKFLOW.md)
- [Cloudflare Setup](docs/CLOUDFLARE_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)

## v0.1の位置づけ

朝マズメ潮ナビで得た実証結果を基にした初版です。良かった「GitHub設計正本・HTML設計Preview・設計先行」は継承し、設計書の責務分離、ADR、要件トレーサビリティを追加しています。別ジャンルのアプリで検証し、3〜5アプリで繰り返し有効だったものを標準へ昇格します。
