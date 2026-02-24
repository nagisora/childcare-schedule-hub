---
name: supabase-cli
description: Supabase の操作手段（CLI / MCP / スクリプト）の使い分け、実行方法、認証。Cursor マーケットプレイスで Supabase プラグイン導入時は Supabase MCP も同梱される。Use when working with Supabase CLI, MCP, migrations, db push, db diff, link, or when the user mentions "supabase コマンドが見つかりません" or "Access token not provided".
---

# Supabase 操作ガイド（CLI / MCP / スクリプト）

## 使い分け方針

| 手段 | 主な用途 | 優先度 |
|------|----------|--------|
| **Supabase MCP** | テーブル一覧・スキーマ確認、簡単な SQL 実行、ログ取得、型生成、プロジェクト情報取得、開発用マイグレーション適用 | **最優先**（利用可能な場合） |
| **Supabase CLI** | ローカル開発（start/stop）、マイグレーション生成（db diff）、本番/CI での db push、db lint、link | MCP でできない操作 |
| **Node スクリプト** | スクレイピング結果の一括投入、条件分岐の多い複雑なデータ更新、繰り返しバッチ処理 | ロジックが複雑なデータ操作のみ |

### 詳細な使い分け

- **テーブル一覧・スキーマ確認**: MCP の `list_tables` を優先。CLI の inspect はローカル DB 向けの詳細統計（table-stats 等）に使用。
- **簡単な SELECT / INSERT / UPDATE**: MCP の `execute_sql` を優先。Cursor 内で完結する。
- **型生成**: MCP の `generate_typescript_types` を優先。CLI の `gen types` は MCP が使えない場合の代替。
- **マイグレーション適用**: 開発用プロジェクトでは MCP の `apply_migration` で可。本番・CI では CLI の `db push` を推奨（履歴追跡・自動化のため）。
- **マイグレーション生成（db diff）**: CLI のみ。ローカル DB との差分から SQL を生成する。
- **ローカル開発**: CLI のみ（`supabase start` / `stop`）。
- **ログ・アドバイザー取得**: MCP の `get_logs` / `get_advisors` を優先。

**SQL・スキーマ・RLS のベストプラクティス**は、マーケットプレイス導入の **supabase-postgres-best-practices** スキルを参照する。

---

## Supabase MCP（Cursor プラグイン同梱）

Cursor マーケットプレイスで Supabase プラグインを導入すると、**Supabase MCP** も同梱される。AI アシスタントが Supabase プロジェクトに直接アクセスできる。

### 主な MCP ツール

| カテゴリ | ツール | 用途 |
|----------|--------|------|
| DB | `list_tables` | テーブル一覧・スキーマ確認 |
| DB | `execute_sql` | SQL 実行（SELECT / INSERT / UPDATE 等） |
| DB | `list_migrations` / `apply_migration` | マイグレーション一覧・適用 |
| DB | `list_extensions` | Postgres 拡張一覧 |
| ユーティリティ | `generate_typescript_types` | 型生成 |
| ユーティリティ | `get_project_url` / `get_anon_key` | プロジェクト情報取得 |
| デバッグ | `get_logs` | API / Postgres / Auth 等のログ取得 |
| デバッグ | `get_advisors` | セキュリティ・パフォーマンスアドバイザー |
| プロジェクト | `list_projects` / `get_project` | プロジェクト一覧・詳細 |

### MCP 利用時の注意

- **開発用プロジェクト**での利用を推奨。本番接続時は読み取り専用モードやプロジェクトスコープを検討。
- 初回利用時は OAuth で Supabase にログインする必要がある。
- MCP が使えない環境（CI 等）では CLI にフォールバックする。

---

## Supabase CLI

### コマンドの実行方法

`supabase` が PATH にない場合は、直接 `supabase` を叩かず次を使う:

```bash
pnpm dlx supabase <サブコマンド>
```

または: `npx supabase <サブコマンド>`

### 認証・リンク

`SUPABASE_DB_PASSWORD` と project-ref は `apps/web/.env.local` に格納。

```bash
export SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
export PROJECT_REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' apps/web/.env.local | sed 's|.*https://||; s|\.supabase\.co.*||')
```

**DB 接続 URL**（inspect で `--db-url` に渡す）:

```bash
DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
```

**リモート操作の前**に、CLI が使えるか確認する。未ログインならユーザーに依頼する:

1. `pnpm dlx supabase login`
2. 未リンクなら: `pnpm dlx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"`

### 操作一覧

#### ローカル開発

| 操作 | コマンド |
|------|----------|
| 起動 | `pnpm dlx supabase start` |
| 停止 | `pnpm dlx supabase stop` |
| 状態確認 | `pnpm dlx supabase status` |

#### マイグレーション

| 操作 | コマンド |
|------|----------|
| リモートに適用 | `pnpm dlx supabase db push --password "$SUPABASE_DB_PASSWORD"` |
| スキーマ差分からマイグレーション生成 | `pnpm dlx supabase db diff --schema public -f supabase/migrations/$(date +%Y%m%d%H%M%S)_<name>.sql` |
| 新規マイグレーション作成 | `pnpm dlx supabase migration new <name>` |
| 整合性チェック | `pnpm dlx supabase db lint` |
| リモートとリンク | `pnpm dlx supabase link --project-ref $PROJECT_REF --password "$SUPABASE_DB_PASSWORD"` |

#### DB 情報取得（inspect）

リモートの場合は `--db-url "$DB_URL"` を付与。リンク済みなら省略可。

| 操作 | コマンド |
|------|----------|
| テーブル統計 | `pnpm dlx supabase inspect db table-stats --db-url "$DB_URL"` |
| DB 統計 | `pnpm dlx supabase inspect db db-stats --db-url "$DB_URL"` |
| インデックス統計 | `pnpm dlx supabase inspect db index-stats --db-url "$DB_URL"` |
| 長時間クエリ | `pnpm dlx supabase inspect db long-running-queries --db-url "$DB_URL"` |

#### その他

| 操作 | コマンド |
|------|----------|
| 型生成（MCP が使えない場合の代替） | `pnpm dlx supabase gen types typescript --project-id $PROJECT_REF > lib/database.types.ts` |
| ログイン | `pnpm dlx supabase login` |
| プロジェクト一覧 | `pnpm dlx supabase projects list` |

#### データ取得（SELECT 相当）

**MCP が使える場合**: `execute_sql` を優先。

**MCP が使えない場合** - REST API（curl）:

```bash
SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
curl -s "${SUPABASE_URL}/rest/v1/<テーブル名>?select=col1,col2&limit=10" \
  -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" -H "Accept: application/json"
```

---

## Node スクリプト（Supabase JS）

以下の場合に Node スクリプト（`@supabase/supabase-js` + service role）を使う:

- スクレイピング結果の一括投入
- 条件分岐の多い複雑なデータ更新
- 繰り返し実行するバッチ処理

スキーマ変更・固定データの少量追加は、マイグレーション SQL で冪等に記述する。

---

## 実行前チェック

- プロジェクトルート（`supabase/` があるディレクトリ）で CLI を実行する。
- `apps/web/.env.local` に必要な変数がある。
- **CLI のリモート操作（link, db push）**: `supabase login` 済みであること。未済の場合は処理を止め、ユーザーに login（と必要なら link）を依頼する。

---

## トラブルシューティング

| エラー | 対応 |
|--------|------|
| **Access token not provided** | 処理を止め、ユーザーに `pnpm dlx supabase login` を依頼する。 |
| **Cannot find project ref** | 同上のあと、`pnpm dlx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"` を依頼する。 |
| **supabase コマンドが見つかりません** | `pnpm dlx supabase` または `npx supabase` を使う。 |
| **connection refused** | ローカル DB 未起動なら `supabase start`。リモートなら `--db-url "$DB_URL"` を指定する。 |
| **MCP が使えない** | CLI または REST API / スクリプトにフォールバック。MCP の OAuth 未ログインなら、初回実行時にブラウザで認証する。 |
