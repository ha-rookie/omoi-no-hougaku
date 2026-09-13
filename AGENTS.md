# AGENTS.md

## 目的

AIは、速くコードを書くことより、設計・証跡・レビュー可能性・安全な回復を優先する。

## 設計書の読み方

作業開始時は `docs/README.md` を入口にし、変更内容に対応する正本を読む。

- 目的・対象: `docs/00_PROJECT_OVERVIEW.md`
- 機能/非機能要件: `docs/01_REQUIREMENTS.md`
- System全体構成: `docs/02_SYSTEM_ARCHITECTURE.md`
- App内部構成: `docs/03_APPLICATION_ARCHITECTURE.md`
- File/Folder配置: `docs/04_REPOSITORY_STRUCTURE.md`
- 設計変更ルール: `docs/05_DESIGN_MANAGEMENT.md`
- Requirement対応: `docs/06_REQUIREMENTS_TRACEABILITY.md`
- Visual Design: `docs/design/`
- 重要な設計判断: `docs/adr/`

同じ仕様を複数設計書へコピーして正本を増やさない。担当外の文書からは設計IDまたはリンクで参照する。

## 作業順序

1. `docs/README.md` と関連設計書、Issueを読む
2. 対象REQ/NFR/ARCH/APP/UI/DATA/IF/ADR、変更範囲、非対象を確認する
3. 仕様変更なら正本設計書を先に更新する
4. Architecture上の重要判断ならADRを更新・追加する
5. Requirement変更ならTraceabilityも更新する
6. 1 Issue専用Branchで実装する
7. lint・test・buildを実行する
8. Previewで確認可能な状態にする
9. 人間承認前にmainへマージしない
10. Merge後にProductionと主要回帰を確認する

## 必須ルール

- mainを直接変更しない
- 秘密情報、認証情報、個人情報をcommitしない
- ProductionデータへPreviewから書き込まない
- 承認済みAssetを独断で再生成・変更しない
- 外部仕様や現在値を推測で確定しない
- TBDをAI判断で勝手に閉じない
- CI失敗を再実行だけで済ませず、根本原因を分類する
- Closed・Unmergedを自動的に失敗扱いしない
- 破壊的操作、本番公開、重要なMerge、認証は人間判断を残す
- コードが動いていても、必要な設計更新が欠けていれば完了扱いにしない

## 設計変更

Small Changeは同一Branch内で設計を先に更新してから実装してよい。

Architecture、画面構造、データschema、認証、課金、外部IF等の重要変更は、必要に応じてDesign Issue/PRを先に承認し、Implementation Issueへ承認Design PR/SHA/設計IDを引き継ぐ。

詳細は `docs/05_DESIGN_MANAGEMENT.md` を参照する。

## Pull Request

PR本文にはIssue、変更内容、非対象、変更した設計書/設計ID、テスト、Security、SEO、Preview、人間確認、回復方法を記載する。

Draft解除コネクタの互換性が確認できるまでは通常PRを使用し、レビューゲートでマージを止める。Replacement PRを作る場合は元PR、同一head SHA、承認内容、CI run、Preview runを引き継ぐ。

## Asset

画像要件 → 生成 → 人間確認 → Design Preview → 承認head SHA → 本番配置の順に扱う。Chat上の生成物が自動的にRepositoryへ入る前提を置かない。

## Cloudflare

機能開発前にHello WorldをPreviewとProductionへ通す。環境変数、Secrets、Bindings、Analytics、Domain、Rollbackを確認する。Pages／Workersはプロジェクト要件と現行公式仕様で選ぶ。
