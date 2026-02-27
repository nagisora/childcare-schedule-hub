## Cursor Cloud specific instructions

### プロジェクト概要

名古屋市の子育て拠点スケジュールを管理する Next.js 15 (App Router) + Supabase のモノレポ。
- `apps/web` — メインの Web アプリ（Next.js）
- `apps/scripts` — データ収集スクリプト
- `supabase/` — Supabase 設定 + マイグレーション

### ランタイム・パッケージマネージャー

- Node.js >= 22（LTS）、パッケージマネージャーは **pnpm**（npm は使わない）
- バージョン管理は **mise**（`mise.toml` 参照）

### コマンド一覧

README.md の `scripts` セクションを参照。主要コマンド:

| 操作 | コマンド |
|------|----------|
| 依存インストール | `pnpm install` |
| 開発サーバー | `pnpm --filter web dev` (port 3000) |
| Lint | `pnpm --filter web lint` |
| Format チェック | `pnpm --filter web format:check` |
| 型チェック | `pnpm --filter web typecheck` |
| 単体テスト | `pnpm --filter web test` |
| E2E テスト | `pnpm --filter web e2e` |

### Supabase ローカル開発

Docker が必要。ローカル Supabase の起動手順:

1. Docker デーモンを起動: `sudo dockerd &` → `sudo chmod 666 /var/run/docker.sock`
2. `pnpm dlx supabase start` でローカル Supabase を起動（マイグレーション自動適用）
3. `pnpm dlx supabase status -o env` で接続情報を取得
4. `apps/web/.env.local` に `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` を設定

ローカル DB は seed データが限定的（施設 1 件のみ）のため、一部 E2E テストは失敗する場合がある。

### 注意点

- `pnpm install` 時に `esbuild`, `sharp`, `unrs-resolver` のビルドスクリプト承認が必要。`package.json` の `pnpm.onlyBuiltDependencies` で設定済み。
- Playwright の E2E テストは Chromium のみ。初回は `pnpm exec playwright install chromium --with-deps` でブラウザをインストール。
- `.env.local` ファイルは `.gitignore` 対象。コミットしないこと。
