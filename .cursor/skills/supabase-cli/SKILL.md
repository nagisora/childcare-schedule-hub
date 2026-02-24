---
name: supabase-cli
description: Supabase CLI を使った操作全般を案内する。コマンド実行方法（supabase が PATH にない場合）、SUPABASE_DB_PASSWORD の取得、マイグレーション・DB 情報取得・ローカル開発などのワークフロー。Use when working with Supabase CLI, migrations, db push, db diff, inspect, or when the user mentions "supabase コマンドが見つかりません".
---

# Supabase CLI 操作全般

## 重要: supabase コマンドの実行方法

`supabase` コマンドが PATH にない場合、**直接 `supabase` を叩かず**、以下のいずれかを使う:

```bash
pnpm dlx supabase <サブコマンド>
```

または（pnpm が使えない場合）:

```bash
npx supabase <サブコマンド>
```

## 認証情報の取得

`SUPABASE_DB_PASSWORD` と `project-ref` は `apps/web/.env.local` に格納。隠しファイルだが Read ツールや grep でパス指定すれば参照可能。

**環境変数セット用ワンライナー**:

```bash
export SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
export PROJECT_REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' apps/web/.env.local | sed 's|.*https://||; s|\.supabase\.co.*||')
```

**DB 接続 URL**（inspect 等で `--db-url` に渡す）:

```bash
DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
```

---

## 操作カテゴリ

### ローカル開発

| 操作 | コマンド |
|------|----------|
| 起動 | `pnpm dlx supabase start` |
| 停止 | `pnpm dlx supabase stop` |
| 状態確認 | `pnpm dlx supabase status` |

### マイグレーション

| 操作 | コマンド |
|------|----------|
| リモートに適用 | `pnpm dlx supabase db push --password "$SUPABASE_DB_PASSWORD"` |
| スキーマ差分をマイグレーション生成 | `pnpm dlx supabase db diff --schema public -f supabase/migrations/$(date +%Y%m%d%H%M%S)_<name>.sql` |
| 新規マイグレーション作成 | `pnpm dlx supabase migration new <name>` |
| 整合性チェック | `pnpm dlx supabase db lint` |
| リモートとリンク | `pnpm dlx supabase link --project-ref $PROJECT_REF --password "$SUPABASE_DB_PASSWORD"` |

### DB 情報取得（inspect）

リモート DB に接続する場合は `--db-url "$DB_URL"` を付与。リンク済みなら省略可。

| 操作 | コマンド |
|------|----------|
| テーブル統計（行数・サイズ等） | `pnpm dlx supabase inspect db table-stats --db-url "$DB_URL"` |
| DB 統計 | `pnpm dlx supabase inspect db db-stats --db-url "$DB_URL"` |
| インデックス統計 | `pnpm dlx supabase inspect db index-stats --db-url "$DB_URL"` |
| 長時間クエリ | `pnpm dlx supabase inspect db long-running-queries --db-url "$DB_URL"` |

### データ取得（SELECT 相当）

**方法 A: inspect db table-stats** — テーブルごとの行数・サイズを取得

```bash
export SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
export PROJECT_REF=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' apps/web/.env.local | sed 's|.*https://||; s|\.supabase\.co.*||')
DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
pnpm dlx supabase inspect db table-stats --db-url "$DB_URL"
```

**方法 B: REST API（curl）** — 任意のテーブルから行データを取得

```bash
SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
curl -s "${SUPABASE_URL}/rest/v1/<テーブル名>?select=col1,col2&limit=10" \
  -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" -H "Accept: application/json"
```

### その他

| 操作 | コマンド |
|------|----------|
| 型生成 | `pnpm dlx supabase gen types typescript --project-id $PROJECT_REF > lib/database.types.ts` |
| ログイン | `pnpm dlx supabase login` |
| プロジェクト一覧 | `pnpm dlx supabase projects list` |

---

## 実行前チェックリスト

- [ ] プロジェクトルート（`supabase/` があるディレクトリ）で実行する
- [ ] `apps/web/.env.local` に必要な変数が設定されている
- [ ] リモート操作（link, db push）の場合は `supabase login` 済みであること

## トラブルシューティング

**「Access token not provided」**: `pnpm dlx supabase login` でブラウザ認証する。

**「supabase コマンドが見つかりません」**: 必ず `pnpm dlx supabase` または `npx supabase` を使う。

**「connection refused」**: ローカル DB 未起動。`supabase start` を先に実行するか、リモート用に `--db-url` を指定する。
