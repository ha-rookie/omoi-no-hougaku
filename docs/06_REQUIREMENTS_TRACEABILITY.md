# Requirements Traceability

## 1. 目的

要件が設計・Issue・実装・テストへ落ちているかを追跡し、設計を深掘りした結果として初期要件が暗黙に消えることを防ぐ。

## 2. 状態

- ACTIVE: 現在有効
- REPLACED: 目的を保ち別仕様へ置き換え
- DEFERRED: 後続Phaseへ延期
- REMOVED: 明示的に削除
- TBD: 方針または詳細未確定

ACTIVE / NEW相当の要件をDEFERRED/REMOVEDへ変える場合はIssue/PRに理由を残す。

## 3. Traceability Matrix

| Requirement | Summary | Design IDs | ADR | Issue/PR | Implementation | Test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Google Maps共有情報から地点登録候補を取得 | APP-002, APP-020, APP-033, APP-034, APP-035, IF-005, IF-006 | ADR-0001, ADR-0003 | Issue #2 / Issue #14 | `poc/google-maps-share-link/resolver.mjs`, `functions/api/resolve-map.js`, `functions/_shared/google-maps-resolver.js` | client resolver test + server resolver test + Android実機 | ACTIVE |
| REQ-002 | 地点へ任意の表示名を設定 | APP-002, APP-010, DATA-001 | ADR-0002 | 未作成 | 未実装 | 未実装 | ACTIVE |
| REQ-003 | 最大5地点を端末内保存 | APP-010, APP-030, DATA-001, DATA-002 | ADR-0002 | 未作成 | 未実装 | 未実装 | ACTIVE |
| REQ-004 | 保存地点の一覧・選択・削除 | APP-001, APP-030 | ADR-0002 | 未作成 | 未実装 | 未実装 | ACTIVE |
| REQ-005 | 現在地取得 | APP-031, IF-002 | - | 未作成 | 未実装 | 未実装 | ACTIVE |
| REQ-006 | 現在地から目的地への初期方位角計算 | APP-021 | - | 未作成 | 未実装 | 未実装 | ACTIVE |
| REQ-007 | 端末方位と目的地方向を表示 | APP-003, APP-011, APP-032, IF-003 | - | 未作成 | 未実装 | 未実装 | ACTIVE |
| REQ-008 | Google Mapsを外部で開く | UI-002, IF-004 | ADR-0001 | 未作成 | 未実装 | 未実装 | ACTIVE |
| REQ-009 | PWA対応 | APP §11 | - | 未作成 | 未実装 | 未実装 | DEFERRED |
| REQ-010 | Google Maps共有先として受信 | APP §11 | - | 未作成 | 未実装 | 未実装 | DEFERRED |
| NFR-001 | 登録地点をサーバーDBへ保存しない | ARCH Security / APP-030 | ADR-0002, ADR-0003 | 全関連Issue | localStorage予定 / Resolverはstateless | Network review | ACTIVE |
| NFR-002 | 外部入力を検証し未検証HTML挿入を避ける | APP-020, APP-033, APP-035, APP §13 | ADR-0001, ADR-0003 | Issue #2 / #14 | client/server resolver | 異常系テスト | ACTIVE |
| NFR-003 | 解析失敗時に推測座標を返さない | APP-020, APP-033, APP-035 | ADR-0001, ADR-0003 | Issue #2 / #14 | client/server resolver | viewport/unsupported/invalid tests | ACTIVE |
| NFR-004 | 方角を色だけで表現しない | UI-003 | - | 未作成 | 未実装 | Manual | ACTIVE |
| NFR-005 | Google Maps Platform API費用0円 | IF-004, IF-005, IF-006 | ADR-0001, ADR-0003 | Issue #2 / #14 | API未使用 | Dependency review | ACTIVE |
| NFR-006 | モバイル回線でも軽量表示 | UI/App全体 | - | 未作成 | 未実装 | Lighthouse等 | ACTIVE |
| NFR-007 | Androidを主要実機対象 | APP §14 | - | Issue #2 / #14 | PoC HTML | Android Chrome実機 | ACTIVE |
| NFR-008 | Analyticsへ地点情報を送信しない | APP §12 | ADR-0002 | Analytics導入時 | 未実装 | Event review | ACTIVE |
| NFR-009 | Resolverで入力URL・座標を永続保存/log出力しない | ARCH §8, APP-035, IF-006 | ADR-0003 | Issue #14 | Pages Function | Code/runtime review | ACTIVE |

## 4. 共有リンクPoCの判定

- Client-only `maps.app.goo.gl` 解決: Android Chrome実機で `Failed to fetch`。主導線として不成立
- 代替方針: 人間承認後、Pages Functionによる一時redirect解決を採用
- 次の判定: Issue #14でServer resolverをProductionへDeployし、同じ実機共有リンクで座標取得できるか確認する

## 5. 変更ルール

1. 新要件を追加したらRequirement IDを採番
2. 対応する設計IDまたはADRを関連付ける
3. 実装Issue/PRを関連付ける
4. Testまたは確認方法を関連付ける
5. 要件変更時は状態と理由を更新する

## 6. Coverage Review

Release前に確認する。

- ACTIVEなRequirementに設計があるか
- ACTIVEなRequirementに実装または明示的な未実装理由があるか
- Test/確認方法があるか
- REPLACED/DEFERRED/REMOVEDに理由が残っているか
- 実装だけ存在し要件に紐づかない機能がないか
