# Git Workflow

## 原則

1 Issue・1 Branch・1 Pull Requestを基本とし、mainは直接変更しない。

## Branch命名

- `feat/issue-<number>-<summary>`
- `fix/issue-<number>-<summary>`
- `design/issue-<number>-<summary>`
- `docs/issue-<number>-<summary>`

## PR作成前

- Issueの受け入れ条件を確認
- 最新mainを取り込む
- lint・test・buildを実行
- 設計書、Security、SEO、データ、運用影響を確認
- Preview確認方法を用意

## Review Gate

通常PRを第一候補とする。CI、Preview、スマホ実機、人間承認、承認head SHAを記録してからMergeする。

## Branch保護が強制できない場合

GitHub画面でRulesetが強制されないと表示される場合、設定済みと扱わない。

private個人開発では、次を代替ゲートとする。

- AIはmainを直接変更しない
- 変更ごとにIssue、専用Branch、PRを作る
- CI成功後に人間が内容を確認する
- 承認対象のhead SHAを確認してからMergeする
- Mergeは明示的な人間承認後だけ行う
- Force pushとBranch削除を行わない

強制的なBranch保護が必要な場合は、repositoryのPublic化または対応するGitHubプラン・organizationへの移行を人間が判断する。

## Draft解除に失敗した場合

Git競合と決めつけない。CI、mergeable、Draft状態、解除API、base、保護ルール、権限を分けて確認する。

同一head SHAから非Draft PRを作り、元PR番号、承認head SHA、CI run、Preview run、レビュー結果を引き継ぐ。

## Merge後

main CI、Production Deploy、本番表示、主要回帰、Issue Closeを確認する。
