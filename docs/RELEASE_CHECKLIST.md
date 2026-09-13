# Release Checklist

## 設計・Issue

- [ ] 要件と非対象が明確
- [ ] 設計書更新済み
- [ ] 受け入れ条件が検証可能
- [ ] Security・SEO・データ・運用影響を確認

## Code・CI

- [ ] lint・test・build成功
- [ ] 静的データ検証成功
- [ ] 秘密情報なし
- [ ] 主要回帰なし

## Preview

- [ ] Preview Deploy成功
- [ ] スマホ実機確認
- [ ] シークレットモード確認
- [ ] Productionデータへ書き込まない
- [ ] 人間承認と承認head SHAを記録

## UI・Asset

- [ ] 折り返し、選択、focus、disabledを確認
- [ ] 色だけに依存していない
- [ ] 承認済みAssetを使用
- [ ] 画像欠落・参照切れなし

## SEO・Security

- [ ] title・description・canonical
- [ ] OGP・favicon
- [ ] robots・sitemap・Preview noindex
- [ ] Security Headers・CSP・外部リンク

## Cloudflare・Analytics

- [ ] Variables・Secrets・Bindings
- [ ] Production Deploy
- [ ] Analytics受信
- [ ] Previewを本番計測から除外

## Production・Recovery

- [ ] 本番の主要操作成功
- [ ] ログに重大エラーなし
- [ ] 前回正常版を特定可能
- [ ] Rollback手順確認
- [ ] Lessons Learned更新要否を記録
