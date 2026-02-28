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

### 環境変数 (.env.local)

`apps/web/.env.local` はシークレット経由で自動設定する。必要な環境変数:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`（必須）
- `ADMIN_BASIC_AUTH_USER`, `ADMIN_BASIC_AUTH_PASSWORD`, `ADMIN_API_TOKEN`（管理画面用）
- `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX`（Instagram 検索用）
- `SUPABASE_DB_PASSWORD`（CLI 操作用）

シークレットが環境変数として注入されている場合は、以下のように `.env.local` を生成する:
```bash
cat > apps/web/.env.local << EOF
NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
GOOGLE_CSE_API_KEY="${GOOGLE_CSE_API_KEY}"
GOOGLE_CSE_CX="${GOOGLE_CSE_CX}"
ADMIN_API_TOKEN="${ADMIN_API_TOKEN}"
ADMIN_BASIC_AUTH_USER="${ADMIN_BASIC_AUTH_USER}"
ADMIN_BASIC_AUTH_PASSWORD="${ADMIN_BASIC_AUTH_PASSWORD}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD}"
EOF
```

### Supabase ローカル開発（オプション）

リモート DB が利用できない場合、Docker でローカル Supabase を起動可能:

1. Docker デーモンを起動: `sudo dockerd &` → `sudo chmod 666 /var/run/docker.sock`
2. `pnpm dlx supabase start` でローカル Supabase を起動（マイグレーション自動適用）
3. `pnpm dlx supabase status -o env` で接続情報を取得
4. `apps/web/.env.local` に接続情報を設定

ローカル DB は seed データが限定的（施設 1 件のみ）のため、一部 E2E テストは失敗する。

### 注意点

- `pnpm install` 時に `esbuild`, `sharp`, `unrs-resolver` のビルドスクリプト承認が必要。`package.json` の `pnpm.onlyBuiltDependencies` で設定済み。
- Playwright の E2E テストは Chromium のみ。初回は `pnpm exec playwright install chromium --with-deps` でブラウザをインストール。
- `.env.local` ファイルは `.gitignore` 対象。コミットしないこと。
- E2E テスト（Playwright）は一部テストに既存の不具合あり（`article` ロールのセレクタが施設一覧行とお気に入りカード両方にマッチする等）。TC-E2E-01, TC-E2E-04, TC-E2E-07 の 3 件は安定して通過する。
