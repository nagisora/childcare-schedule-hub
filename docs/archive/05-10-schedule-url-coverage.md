# フェーズ10詳細: スケジュールURLの全面カバー

## 0. 進捗チェックリスト（正本）

このドキュメントはフェーズ10の進捗管理の正本です。  
作業ログは最小運用とし、証跡は本書・Runbook・Issue に集約します。

- [x] 手動登録フロー（開発者利用施設向け）が確立されている
- [x] `schedules.instagram_post_url` の登録/更新手順が整備されている
- [x] 品質チェック（`published_month` 整合・重複・URL形式）を実施済み
- [x] 自動取得は実装済みだが、MVPでは手動登録完了を採用している

## 1. 概要

- 対応フェーズ: フェーズ10
- 目的: 月間スケジュールの投稿 URL を `schedules` に安全に反映できる状態を作る
- MVP方針: 自動取得の精度向上は後回し。手動登録で完了とする

## 2. 運用方針（現行）

- API: `apps/web/app/api/instagram-schedule-search/route.ts`
- CLI: `apps/scripts/fetch-instagram-schedule-post-urls.ts`
- UPSERT API: `apps/web/app/api/admin/schedules/upsert/route.ts`
- ロールバック補助: `apps/scripts/rollback-schedules-from-backup.ts`

## 3. 品質チェック（最低限）

- `published_month` は対象月の1日で統一されていること
- `(facility_id, published_month)` で重複がないこと
- `instagram_post_url` が `instagram.com/(p|reel)` 形式であること
- 共有リンク由来のクエリ/フラグメントが残っていないこと

## 4. 代表コマンド

```bash
# API/フロント側テスト
pnpm --filter web test

# 型チェック
pnpm --filter web typecheck

# スケジュール候補CLI（実行例）
pnpm --filter scripts tsx fetch-instagram-schedule-post-urls.ts --limit=3 --month=YYYY-MM
```

## 5. 後回し方針

- 自動取得精度の改善（OCR/AIを含む）は `docs/20-deferred-work.md` の DW-008 で管理する
- 運用Runbookの詳細化（登録ルール/月次更新/品質チェック）は DW-007 で管理する

## 6. 関連ドキュメント

- `docs/05-00-development-phases.md`
- `docs/04-development.md`
- `docs/phase-artifacts/10-schedule-url-coverage/reason-codes.md`
- `docs/20-deferred-work.md`
