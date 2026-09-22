# Visual Design: Morning Mist

Status: Accepted  
Related Issue: #59  
Human visual reference: user-provided mockup in the 2026-09-22 review

## 1. Design intent

「想いの方角」は、機能を強く主張するUtilityではなく、大切な場所へ静かに意識を向けるための道具として見せる。

Visualは次の語彙で統一する。

- 生成り
- 朝もや
- 墨色
- 青灰
- 細い線
- 余白
- 静けさ

装飾で情緒を作りすぎず、情報密度を下げた余白と低コントラストで空気感を作る。

## 2. Palette

| Token | Value | Role |
| --- | --- | --- |
| Background | `#F5F2EA` | App全体の生成り背景 |
| Card | `#FBF9F4` | Card / input / surface |
| Text | `#343532` | 主文字 |
| Accent | `#556468` | CTA / Compass needle / selected state |
| Delete | `#A35A52` | destructive action |
| Muted | `#74746E` | 補助文字 |
| Border | `#D8D3C8` | Card / controlの細線 |
| Mist | `#E8ECE9` | 朝もやの淡い層 |
| Quiet background | `#111315` | Quiet Mode |

## 3. Typography

### Heading / brand

日本語明朝系を優先する。

```css
"Yu Mincho", "Hiragino Mincho ProN", "Hiragino Mincho Pro", "Noto Serif JP", serif
```

対象:
- App title
- h2
- Direction target title

### UI / body

system sans-serifを使う。

対象:
- Button
- Input
- status
- metadata
- metric values

## 4. Background

Raster background imageを必須にしない。

ProductionではCSS-onlyのmist surfaceを基本とする。

- 生成りbase
- very low opacityのradial / linear mist
- edge側に淡い青灰
- content readabilityを優先
- scroll時に文字の背後へ強い模様を置かない

将来、承認済みAssetを使う場合もこのVisual tokenに従う。

## 5. Card

- Card colorはpure whiteを使わず `#FBF9F4`
- 1px border
- shadowは非常に弱くする
- radiusは18〜22px
- Card間の余白を十分取る

## 6. Navigation / flow

情報設計はVisual変更で変えない。

1. 保存した場所
2. 保存地点を選ぶ
3. Direction（Compass / Map）
4. 場所を追加
5. Google Mapsから共有
6. 名前を付けて保存

Visual redesignを理由に中間Cardや追加clickを復活させない。

## 7. Buttons

Primary:
- background `#556468`
- light text
- strong blackは使わない

Secondary:
- Card色
- Accent/Text border

Delete:
- border/text `#A35A52`
- fillは原則使わない

Pill shapeは維持するが、影を強くしない。

## 8. Compass

- target-up reference frameは変更しない
- 外周 / tickは細く淡くする
- NeedleはAccent
- Target markerはText/Accentの中間
- 方角文字はText
- pure blackを主要色にしない

## 9. Map

- land: warm gray / mist gray
- border: low contrast
- relationship line: Accent
- target/current marker: Text/Accent
- map background: Card
- data attributionは視認可能だが目立たせない

## 10. Quiet Mode

通常画面とは明確に切り替える。

- dark neutral background
- accentをほぼ使わない
- 地点名 + 最小メッセージ
- motionは短いfadeのみ
- user interactionでのみ入る
- tap / keyboardで戻る

## 11. Accessibility

- Text / Cardのcontrastを優先
- stateを色だけで表現しない
- focus-visibleを維持
- `prefers-reduced-motion`を尊重
- destructive actionはDelete色 + textで示す

## 12. Non-goals

- Feature logic変更
- Storage / Share / API変更
- Compass / Map calculation変更
- 新規画像Asset生成
- 外部Font読込
