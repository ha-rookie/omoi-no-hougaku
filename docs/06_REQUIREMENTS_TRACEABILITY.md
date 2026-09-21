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
| REQ-001 | Google Maps共有から地点登録候補を自動確定 | APP-002, APP-004, APP-010, APP-020, APP-021, APP-033, APP-034, APP-035, IF-005〜IF-009 | ADR-0004 | #18 #20 #22 #25 #29 #31 | `public/js/core/shared-location.js`, `public/js/app/receive-shared-place.js`, `public/js/infrastructure/location-resolver-client.js`, `functions/api/resolve-location.js` | `shared-location.test.mjs`, `receive-shared-place.test.mjs`, Android実機 | ACTIVE |
| REQ-002 | 地点へ任意の表示名を設定 | APP-002, APP-011, DATA-001 | ADR-0002 | #31 | `public/index.html`, `public/js/app/register-place.js`, `public/js/infrastructure/place-repository.js` | `place-repository.test.mjs` +人間UI確認 | ACTIVE |
| REQ-003 | 最大5地点を端末内保存 | APP-011, APP-030, DATA-001, DATA-002 | ADR-0002 | #31 | `public/js/infrastructure/place-repository.js` | `place-repository.test.mjs` | ACTIVE |
| REQ-004 | 保存地点の一覧・選択・削除 | APP-001, APP-030 | ADR-0002 | #31 | `public/js/ui/app-view.js`, `public/app.js`, `public/js/infrastructure/place-repository.js` | `place-repository.test.mjs` +人間UI確認 | ACTIVE |
| REQ-005 | 現在地取得 | APP-031, IF-002 | ADR-0006 | #51 | 未実装 | Geolocation unit/integration + Android permission | ACTIVE |
| REQ-006 | 現在地から目的地への初期方位角計算 | APP-022 | ADR-0006 | #51 | 未実装（Yohai Compass参照実装あり） | known-coordinate bearing/distance unit | ACTIVE |
| REQ-007 | 端末方位と目的地方向を表示 | APP-003, APP-012, APP-032, APP-040, IF-003, IF-012 | ADR-0006 | #51 | 未実装（Yohai Compass参照実装あり） | heading/alignment/WMM unit + 変更境界のAndroid実機 | ACTIVE |
| REQ-008 | Google Mapsを外部で開く | UI-005, IF-004 | ADR-0004 | #31 | `public/index.html` | 人間UI確認 | ACTIVE |
| REQ-009 | PWAとしてインストール | APP §11 | ADR-0004 | #18 #25 #27 #29 #31 | `public/manifest.webmanifest`, `public/sw.js`, `public/assets/app-icon.svg` | CI manifest/service worker validation + Android実機 | ACTIVE |
| REQ-010 | Google Maps共有先として受信 | APP-033, IF-005 | ADR-0004 | #18 #25 #27 #29 #31 | `public/manifest.webmanifest`, `public/sw.js`, `public/app.js` | CI share_target validation + Android実機 | ACTIVE |
| REQ-011 | Compass / Japan Map / World Mapで方向・位置関係を確認 | APP-003, APP-012, APP-037, APP-038, APP-039, DATA-008, DATA-009, IF-011 | ADR-0006 | #51 | 未実装 / `docs/design/01_DIRECTION_COMPASS_MAP.md` | map mode / great-circle / antimeridian unit + Android changed-boundary review | ACTIVE |
| NFR-001 | 登録地点をサーバーDBへ保存しない | ARCH Security / APP-030 | ADR-0002, ADR-0004 | 全関連Issue | Resolver stateless / `PlaceRepository` localStorage | `place-repository.test.mjs` + Network review | ACTIVE |
| NFR-002 | 外部入力を検証し未検証HTML挿入を避ける | APP-020, APP-021, APP §13 | ADR-0004 | #25 #29 #31 | Production classifier + `textContent` DOM生成 + Function validation | classifier異常系 + static review | ACTIVE |
| NFR-003 | 解析失敗時に推測座標を返さない | APP-010, APP-020, APP-021, APP-035 | ADR-0004 | #22 #25 #29 #31 | `receive-shared-place.js` / resolver error handling | invalid/unsupported + Android実機 | ACTIVE |
| NFR-004 | 方角を色だけで表現しない | UI-003 | - | 本番UI Issue | 未実装 | Manual | ACTIVE |
| NFR-005 | Google API呼出を必要最小限にし利用量/課金を確認 | ARCH §11, IF-007, IF-008 | ADR-0004 | #20 #22 #29 | 名称付き施設だけAPI使用 | Network + billing review | ACTIVE |
| NFR-006 | モバイル回線でも軽量表示 | UI/App全体 | - | #31 | build toolなしのHTML/CSS/ES Modules | Lighthouse等（後続確認） | ACTIVE |
| NFR-007 | Androidを主要実機対象 | APP §14 | ADR-0004 | #18 #25 #27 | PoC PWA | Android Chrome/Google Maps実機 | ACTIVE |
| NFR-008 | Analyticsへ地点情報を送信しない | APP §12 | ADR-0002, ADR-0004 | Analytics導入時 | 未実装 | Event review | ACTIVE |
| NFR-009 | 施設解決時のURL/Place ID/座標を永続保存/log出力しない | ARCH §8, APP-035, IF-007 | ADR-0004 | #20 #22 #29 | Pages Function | Code/runtime review | ACTIVE |
| NFR-010 | 任意ピンは外部APIへ送らず端末内で確定 | ARCH-005, APP-020, APP-021 | ADR-0004 | #25 #29 #31 | `classifySharedLocation` + `receiveSharedPlace` | `receive-shared-place.test.mjs`でresolver未呼出確認 + Android実機 | ACTIVE |
| NFR-011 | Google API keyをBrowserへ露出しない | ARCH-006, ARCH-016, APP §13 | ADR-0004 | #20 #22 #29 | Cloudflare Secret | source/runtime review | ACTIVE |
| NFR-012 | Direction地図で現在地・目的地を外部Map providerへ送信しない | APP-037, APP-038, IF-011 | ADR-0006 | #51 | same-origin vector map設計 | Network/static asset review | ACTIVE |

## 4. 地点登録PoCの最終判定

- Client-only `maps.app.goo.gl` fetch: Android Chromeで`Failed to fetch`。不採用
- Pages Functionで通常redirect追跡: Google側`/sorry`へ遷移。不採用
- 短縮Plus Code復元: 全地域の基準点問題があり主導線として不要。#17をnot plannedで終了
- Web Share Target: Android Google Mapsから`title/text/url`受信に成功
- 任意ピン: `title=lat,lng`を直接採用し、元座標と一致。API呼出なし
- 名称付き施設: `maps.app.goo.gl` → Maps Grounding Lite → Place ID → Places API (New) →座標取得に成功
- 任意ピン短縮URLをPlace ID経由で座標化すると元ピンとずれる場合があるため、任意ピンでAPI経路へfallbackしない
- 結論: ADR-0004の2経路をMVPの地点登録主導線とする

## 5. Design→Implementation移行

Issue #29のDesign PRが人間承認されmainへMergeされた後、本番Implementation Issueを作成する。

本番実装ではPoCを直接importせず、以下へ移植する。

- `public/`: 本番PWA / Web Share Target / client modules
- `functions/api/resolve-location.js`: 名称付き施設解決endpoint
- `functions/_shared/`: Google API client
- `tests/`: production modules/functionsのtest

## 6. 変更ルール

1. 新要件を追加したらRequirement IDを採番
2. 対応する設計IDまたはADRを関連付ける
3. 実装Issue/PRを関連付ける
4. Testまたは確認方法を関連付ける
5. 要件変更時は状態と理由を更新する

## 7. Coverage Review

Release前に確認する。

- ACTIVEなRequirementに設計があるか
- ACTIVEなRequirementに実装または明示的な未実装理由があるか
- Test/確認方法があるか
- REPLACED/DEFERRED/REMOVEDに理由が残っているか
- 実装だけ存在し要件に紐づかない機能がないか


## 8. Direction / Map design status

Issue #51では `ha-rookie/yohai-compass` の実績ある方位処理・Map Overviewを参照し、別Repository runtime dependencyにはせず「想いの方角」へ移植する。

設計差分:
- 宗教固有UIを一般化
- Compass / Mapで1つのGuidance Sessionを共有
- 国内2点はJapan Map
- 海外を含む場合はWorld Map
- World Map connectionはgreat-circle + antimeridian処理
- Map表示だけでは外部Map providerへ座標を送らない

人間実機確認は、Yohai Compassで既確認の機能を全て再実施するのではなく、移植時に変更した境界とJapan/World切替を重点対象とする。
