# Requirements

## 1. 文書目的

この文書は「何を満たすべきか」の正本とする。実装方法やファイル配置はここへ書かず、Architecture文書へ分離する。

## 2. 対象ユーザー

- 遠く離れた大切な人や場所の方向を知りたい人
- 故郷、思い出の場所、神社、墓所などを静かに思いたい人
- 自分の想いをSNS等で共有せず個人的に使いたい人
- 日本国内・海外を問わず地点を登録したい人

## 3. 解決する課題

地図アプリでは目的地までの移動経路は分かるが、「いま自分がいる場所から、大切な場所はどちらの方向か」を静かに確認する用途には最適化されていない。

本アプリは、場所の大量収集や共有ではなく、少数の大切な地点を登録し、その方角を向く体験を提供する。

## 4. 利用シナリオ

| ID | シナリオ | 主体 | 成功条件 |
| --- | --- | --- | --- |
| REQ-001 | Google Mapsで見つけた場所を登録する | User | Google Mapsの共有から目的地点の座標を誤推測せず確定できる |
| REQ-002 | 登録地点へ名前を付ける | User | 本人だけが分かる任意の表示名で保存できる |
| REQ-003 | 保存済みの場所を選ぶ | User | 最大5件から目的地点を選択できる |
| REQ-004 | 目的地の方角を確認する | User | 現在地から目的地までの方角が表示される |
| REQ-005 | スマートフォンを目的地の方向へ向ける | User | 端末の向きと目的地方向の関係を理解できる |
| REQ-006 | 登録地点を削除する | User | 不要な地点を端末内から削除できる |

## 5. 機能要件

| ID | 要件 | 優先度 | 受け入れ条件 | 状態 |
| --- | --- | --- | --- | --- |
| REQ-001 | Google Mapsから共有された地点情報を自動判定し、登録候補の緯度経度を取得できる | Must | 任意ピンは共有titleの厳密な`lat,lng`を直接採用し、名称付き施設は共有URLを公式APIで解決する。失敗時は推測しない | Active |
| REQ-002 | 地点に任意の表示名を設定できる | Must | 空文字を除き、ユーザーが入力した名称で保存できる | Planned |
| REQ-003 | 地点を端末内に最大5か所保存できる | Must | 6件目は自動上書きせず、削除が必要であることを示す | Planned |
| REQ-004 | 保存済み地点を一覧表示・選択・削除できる | Must | 保存内容とUIが一致し、削除後に復活しない | Planned |
| REQ-005 | ブラウザの位置情報から現在地を取得できる | Must | 許可時に緯度経度を取得し、拒否/失敗時は理由を表示する | Planned |
| REQ-006 | 現在地と目的地から初期方位角を計算できる | Must | 既知座標のテストケースで期待値範囲に入る | Planned |
| REQ-007 | 端末の向きを利用して目的地方向を示せる | Must | 対応端末で方向の変化に追随し、権限が必要な場合は明示する | Planned |
| REQ-008 | Google Mapsを外部で開ける | Should | 地点探索のためGoogle Mapsへ遷移できる | Planned |
| REQ-009 | Androidを主対象としてPWAとしてインストールできる | Must | manifest/service workerが有効で、インストール済みアプリとして起動できる | Active |
| REQ-010 | Google Mapsから共有先として直接受け取れる | Must | Android Google Mapsの共有先に表示され、共有title/text/urlをWeb Share Targetで受信できる | Active |
| REQ-011 | Direction画面でコンパスと地図を切り替えて現在地と目的地の関係を確認できる | Must | 国内2点は日本地図、海外を含む場合は世界地図を表示し、現在地・目的地・北・距離・目標方位を確認できる | Active |

## 6. 非機能要件

| ID | 分類 | 要件 | 測定・確認方法 |
| --- | --- | --- | --- |
| NFR-001 | Privacy | 登録地点・表示名をMVPではサーバーDBへ保存しない | Network確認、実装レビュー |
| NFR-002 | Security | 共有入力・URL・表示名を未検証のままHTMLへ挿入しない | Static review / Security regression |
| NFR-003 | Accuracy | 地点解析に失敗した場合、推測座標を正常値として扱わない | 異常系テスト |
| NFR-004 | Accessibility | 方角を色だけで表現せず、文字・角度等でも理解可能にする | Manual review |
| NFR-005 | Cost | Google APIは名称付き施設の新規登録時だけ呼び、必要最小フィールドに限定し、利用量と課金状態をリリース前後に確認する | API call review / Google Cloud billing review |
| NFR-006 | Performance | 初期画面と保存済み地点一覧をモバイル回線でも軽量に表示する | Lighthouse等で確認 |
| NFR-007 | Compatibility | Androidスマートフォンを主要実機確認対象とする | 実機テスト |
| NFR-008 | Privacy | Analyticsを導入しても登録地点名・緯度経度・共有URLをイベントへ送信しない | Analytics event review |
| NFR-009 | Privacy | 名称付き施設の解決に必要な共有URLは一時処理に限定し、入力URL・Place ID・取得座標を永続保存またはApplication logへ出力しない | Code review / runtime review |
| NFR-010 | Privacy | 任意ピンの共有titleが有効な緯度経度なら外部APIへ送信せず端末内で確定する | Network review / unit test |
| NFR-011 | Security | Google API keyをブラウザへ露出させずCloudflare Secretで管理する | Build/source review / runtime review |
| NFR-012 | Privacy | Direction地図のために現在地・目的地を外部Map providerへ送信しない | Network review / static asset review |
| NFR-013 | Observability | Production実機確認では `?internal_test=1` を内部テストモードとして認識し、将来導入するアプリ側Analytics/custom eventを本番利用統計へ混ぜない。内部テスト判定はURL queryだけを使い、Core機能は変えない | Unit test / Production URL確認 |

## 7. データ・外部情報要件

- データ源: Google Mapsからの共有情報、ブラウザGeolocation、Device Orientation
- 外部地図: Google Mapsは地点探索と共有元として利用する
- 任意ピン: 共有`title`が厳密な`lat,lng`形式かつ範囲内なら端末内で座標確定する
- 名称付き施設: 共有`text`/`url`の`maps.app.goo.gl`を同一origin Pages Functionへ送り、Maps Grounding Lite `ResolveMapsUrls`でPlace IDへ解決し、Places API (New)で緯度経度を取得する
- Google API: API keyはCloudflare Secretで管理し、Browserへ返さない
- 更新頻度: 地点情報はユーザーの新規登録操作時のみ更新
- 正確性・欠損時の扱い: 座標が検証できない場合は保存させず、取得失敗を明示する
- 個人情報・秘密情報: 表示名と登録地点はセンシティブ情報になり得る。永続保存は端末内を原則とする
- Direction地図: Japan/World GeoJSONと地図runtimeはsame-origin static assetを原則とし、現在地・目的地を外部Map providerへ送信しない

## 8. 制約

- 技術制約: Android Google Maps → Web Share TargetをMVPの地点登録主導線とする
- 技術制約: 任意ピンは共有titleの座標を最優先し、短縮URLをPlace ID経由で座標化しない
- 技術制約: 名称付き施設だけMaps Grounding Lite + Places API (New)を利用する
- 技術制約: Client-only短縮URL展開はAndroid Chromeで不成立確認済み
- 技術制約: Google通常redirectをPages Functionで追う旧方式は`/sorry`に遷移したため主導線にしない
- コスト制約: API呼び出しを新規地点登録時に限定し、保存済み地点表示・方位計算では呼ばない
- 運用制約: DB・ユーザーアカウントを持たない
- プライバシー制約: 任意ピンは可能な限り端末内で処理し、名称付き施設の共有URLだけ必要時にServer/API処理へ送る
- 法務・規約上の制約: Google Mapsの非公開内部URL形式を解析する方式へ恒久依存しない
- 地図制約: Directionの地図は経路検索ではなく位置関係overviewとし、raster tile/POI/衛星画像をMVPでは持たない

## 9. Out of Scope

- SNS共有、いいね、フォロー、ランキング
- 他ユーザーの位置検索・追跡
- 電話番号・SNSアカウント・人名からの現在地取得
- ログイン、クラウド同期
- 登録地点のサーバーDB保存
- Google Maps地図UIのアプリ内埋め込み
- 保存件数の無制限化
- Plus Codeを主導線として復号する機能

## 10. 未決事項

| ID | 論点 | 決定者 | 期限/条件 | 状態 |
| --- | --- | --- | --- | --- |
| TBD-001 | Google Maps共有から地点を安定取得できるか | Human | Android実機統合PoC | Resolved: Web Share Target + 2経路で成立 |
| TBD-002 | Client-only失敗時にServer resolverを使うか | Human | Android実機結果確認後 | Replaced: Google公式API経路を名称付き施設だけ採用 |
| TBD-003 | 地点解析の代替入力を何にするか | Human | 主導線失敗ケース整理後 | Deferred: MVP主導線成立のため後続検討 |
| TBD-004 | PWA/Web Share TargetをMVPに含めるか | Human | 統合PoC完了 | Resolved: MVPに含める |
| TBD-005 | 保存地点の並び順を登録順固定とするか | Human | UI設計時 | Open |
| TBD-006 | Google APIの利用量アラート/予算上限をどこまで設定するか | Human | Production release前 | Open |
| TBD-007 | Japan/World GeoJSONのProduction採用source・license・簡略化方法 | Human | Direction Map実装前 | Resolved: Japan=japan-map-selector/国土数値情報、World=world-atlas/Natural Earth。追加簡略化しsame-origin配信、license/attributionを同梱 |

## 11. 要件変更管理

- 要件変更はIDを維持して履歴を追えるようにする
- 削除ではなく Replaced / Deferred / Removed を使い、理由をIssue/PRへ残す
- 要件変更時は `06_REQUIREMENTS_TRACEABILITY.md` も更新する
- 実装方法の変更だけで要件が変わらない場合、この文書を無理に更新しない
