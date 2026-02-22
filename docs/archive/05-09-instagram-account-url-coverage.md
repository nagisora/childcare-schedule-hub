# フェーズ9詳細: InstagramアカウントURLの全面カバー

## 0. 進捗チェックリスト（正本）

このドキュメントはフェーズ9の進捗管理の正本です。  
作業ログは最小運用とし、証跡は本書・Runbook・Issue に集約します。

- [x] Google Programmable Search Engine（CSE）の設定と環境変数運用が確立されている
- [x] `/api/instagram-search` がサーバーサイドで動作し、候補を正規化して返却できる
- [x] 半自動登録フロー（候補提示→採用/スキップ）が実装されている
- [x] Runbook（標準フロー/フォールバック）が更新されている
- [x] データ品質チェック（ドメイン/重複）を実施済み
- [x] 主要ロジックのテストが実行可能な状態で維持されている（`pnpm --filter web test`）

## 1. 概要

- 対応フェーズ: フェーズ9
- 目的: 名古屋市内施設の Instagram アカウント URL のカバー率を高める
- 非スコープ: スケジュール投稿 URL の全面カバー（フェーズ10で対応）

## 2. 運用方針（現行）

- 検索基盤: Google CSE（`site:instagram.com`）
- API: `apps/web/app/api/instagram-search/route.ts`
- CLI: `apps/scripts/instagram-semi-auto-registration.ts`
- 記録先:
  - 仕様/方針: 本ドキュメント、`docs/04-development.md`
  - 実行手順: `docs/phase-artifacts/09-instagram-integration/04-runbook.md`
  - 後回し事項: `docs/20-deferred-work.md` と GitHub Issue

## 3. 品質チェック（最低限）

- `instagram_url` が `instagram.com` のプロフィール URL 形式であること
- 投稿 URL（`/p/`, `/reel/` など）が混入していないこと
- 不要なクエリパラメータ/フラグメントが残っていないこと
- 同一 URL の重複は意図を説明できること

## 4. 代表コマンド

```bash
# API/フロント側テスト
pnpm --filter web test

# 型チェック
pnpm --filter web typecheck

# 半自動登録CLI（実行例）
pnpm --filter scripts instagram-registration
```

## 5. 関連ドキュメント

- `docs/05-00-development-phases.md`
- `docs/04-development.md`
- `docs/phase-artifacts/09-instagram-integration/03-design-decisions.md`
- `docs/phase-artifacts/09-instagram-integration/04-runbook.md`
- `docs/phase-artifacts/09-instagram-integration/05-instagram-account-search.md`
- `docs/20-deferred-work.md`
