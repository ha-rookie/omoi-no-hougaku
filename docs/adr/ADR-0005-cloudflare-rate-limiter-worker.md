# ADR-0005: Pages FunctionのGoogle API前段を専用Rate Limiter Workerで保護する

- Status: Accepted
- Date: 2026-09-22
- Decision Owners: Human
- Related Issue: #42
- Related Design IDs: ARCH-017 / APP-036 / IF-010

## Context

`POST /api/resolve-location` はCloudflare Pages FunctionからMaps Grounding LiteとPlaces API (New)を呼ぶ。

Google API keyはSecret管理され、利用APIも必要な2 APIへ制限済みだが、匿名公開Endpointのため、Originを偽装したscriptから大量に呼ばれる可能性は残る。

Google Cloud側のResolve Maps URLs quotaは600 requests/minuteで、現在のアカウント状態ではConsoleから引き下げられない。

Cloudflare WorkersにはRate Limiting bindingがある一方、Pages Functionsが直接サポートするbinding一覧にはRate Limitingが含まれない。Pages FunctionsはService bindingで別Workerを内部呼び出しできる。

## Decision Drivers

- Google APIを呼ぶ前に自動遮断したい
- 通知だけではなく429で止めたい
- BrowserへSecretを追加したくない
- KVを厳密なカウンタ用途に使いたくない
- Rate Limiter自体をInternetへ公開したくない
- 独自Domain導入を前提にしたくない
- Cloudflare Free構成の範囲を優先する

## Options Considered

### Option A: Pages FunctionからRate Limiting bindingを直接使う

Pros:

- 構成が最小
- 追加Workerが不要

Cons:

- Pages Functionsの対応binding一覧にRate Limitingは含まれない

### Option B: Workers KVで回数を数える

Pros:

- Pages Functionsから直接利用可能
- 実装しやすい

Cons:

- KVは強整合なカウンタ用途ではない
- race conditionや伝播遅延をRate Limitの正確性へ持ち込む
- Rate Limit専用機能がCloudflareに存在するのに擬似実装となる

### Option C: 専用Worker + Rate Limiting binding + Service binding

Pros:

- Cloudflare公式Rate Limiting APIを利用できる
- PagesからService bindingでInternetを経由せず呼べる
- Workerのworkers.dev/preview URLを無効化できる
- Google API呼び出し前に429判定できる
- PagesとRate Limit責務を分離できる

Cons:

- Workerを1つ追加する
- Workerを先にDeployし、Pages側Service bindingを設定する2段階導入が必要
- Rate Limiting counterはCloudflare location単位で、全世界合算の厳密な30/minではない

## Decision

Option Cを採用する。

専用Worker `omoi-no-hougaku-rate-limiter` を追加し、Cloudflare Rate Limiting bindingを以下で開始する。

- key: `resolve-location`
- limit: 30
- period: 60 seconds
- namespace_id: `20260922`
- workers.dev: disabled
- preview URLs: disabled

導入は2段階に分ける。

1. WorkerをDeployして単体動作を確認する
2. Pages projectからService bindingで接続し、`/api/resolve-location` のGoogle API呼び出し前に必須判定する

## Rationale

今回守りたいのはAPI keyの文字列ではなく、公開Endpoint経由のGoogle API利用量である。

Pages FunctionのOrigin検証はBrowser abuseを減らすが認証ではない。専用Rate Limiter WorkerをGoogle APIの前段へ置くことで、Originを偽装したscriptでも一定回数を超えた呼び出しをGoogleまで到達させない。

## Consequences

Positive:

- 上限超過時に通知待ちではなく自動で拒否できる
- Google API呼び出し回数をCloudflare側で抑制できる
- Rate Limiter WorkerをPublic URLへ露出しない
- 将来limit値をコードレビュー経由で変更できる

Negative / Trade-offs:

- Cloudflare locationごとにcounterが分かれる
- Rate Limiting APIはeventually consistentで、厳密な課金カウンタではない
- 複数Cloudflare locationへ分散した攻撃を全世界合算30/minとして止めることはできない
- Service binding障害時のfail-open/fail-closed方針が必要

## Validation

Phase 1:

- Node unit testでallow / rate limited / binding missing / method拒否を確認
- Worker deploy成功をGitHub Actionsで確認
- workers.devとpreview URLが無効であることを確認

Phase 2:

- PagesからService binding呼び出し成功
- 上限超過時429
- 429時にMaps Grounding Lite / Places APIへ到達しない
- binding不在時のfailure behaviorをProduction smoke testで確認

## Revisit Condition

- 独自Domain導入後にWAF Rate Limiting Ruleへ一本化できる場合
- Auth/User IDを導入しユーザー単位limitが可能になった場合
- Google API利用量が増え、全世界合算のより強い制御が必要になった場合
