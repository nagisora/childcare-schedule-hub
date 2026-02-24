---
name: supabase-cli
description: Supabase CLI の実行方法とワークフロー（コマンド・認証・マイグレーション適用）。リモート操作時は CLI を優先し、CLI が使えない場合は処理を止めてユーザーに login を依頼する。Use when working with Supabase CLI, migrations, db push, db diff, link, or when the user mentions "supabase コマンドが見つかりません" or "Access token not provided".
---

# Supabase CLI 操作

## 方針

- **リモート操作（db push, link 等）**: 原則 **Supabase CLI** を使う。
- **CLI が使えない場合**（「Access token not provided」「Cannot find project ref」）: **処理を止め**、ユーザーに `pnpm dlx supabase login`（必要なら `link`）の実行を依頼する。Node スクリプトで代替しない。
- **データ操作**:
  - スキーマ変更・マイグレーションの適用 → CLI（マイグレーション SQL）。
  - 固定データの少量追加もマイグレーションで冪等に記述。
  - スクレイピング結果の一括投入・条件分岐の多い更新など、**ロジックが複雑なデータ操作**のみ Node スクリプト（Supabase JS + service role）を使う。

**SQL・スキーマ・RLS のベストプラクティス**は、マーケットプレイス導入の **supabase-postgres-best-practices** スキルを参照する。本スキルは CLI の実行手順と認証に特化する。

---

## コマンドの実行方法

`supabase` が PATH にない場合は、直接 `supabase` を叩かず次を使う:

```bash
pnpm dlx supabase <サブコマンド>
```

または: `npx supabase <サブコマンド>`

---

## 認証・リンク

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

---

## 操作一覧

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
| スキーマ差分からマイグレーション生成 | `pnpm dlx supabase db diff --schema public -f supabase/migrations/$(date +%Y%m%d%H%M%S)_<name>.sql` |
| 新規マイグレーション作成 | `pnpm dlx supabase migration new <name>` |
| 整合性チェック | `pnpm dlx supabase db lint` |
| リモートとリンク | `pnpm dlx supabase link --project-ref $PROJECT_REF --password "$SUPABASE_DB_PASSWORD"` |

### DB 情報取得（inspect）

リモートの場合は `--db-url "$DB_URL"` を付与。リンク済みなら省略可。

| 操作 | コマンド |
|------|----------|
| テーブル統計 | `pnpm dlx supabase inspect db table-stats --db-url "$DB_URL"` |
| DB 統計 | `pnpm dlx supabase inspect db db-stats --db-url "$DB_URL"` |
| インデックス統計 | `pnpm dlx supabase inspect db index-stats --db-url "$DB_URL"` |
| 長時間クエリ | `pnpm dlx supabase inspect db long-running-queries --db-url "$DB_URL"` |

### その他

| 操作 | コマンド |
|------|----------|
| 型生成 | `pnpm dlx supabase gen types typescript --project-id $PROJECT_REF > lib/database.types.ts` |
| ログイン | `pnpm dlx supabase login` |
| プロジェクト一覧 | `pnpm dlx supabase projects list` |

### データ取得（SELECT 相当）

**inspect**: 上記の table-stats など。

**REST API（curl）**:

```bash
SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
curl -s "${SUPABASE_URL}/rest/v1/<テーブル名>?select=col1,col2&limit=10" \
  -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" -H "Accept: application/json"
```

---

## 実行前チェック

- プロジェクトルート（`supabase/` があるディレクトリ）で実行する。
- `apps/web/.env.local` に必要な変数がある。
- **リモート操作（link, db push）**: `supabase login` 済みであること。未済の場合は処理を止め、ユーザーに login（と必要なら link）を依頼する。

---

## トラブルシューティング

| エラー | 対応 |
|--------|------|
| **Access token not provided** | 処理を止め、ユーザーに `pnpm dlx supabase login` を依頼する。 |
| **Cannot find project ref** | 同上のあと、`pnpm dlx supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"` を依頼する。 |
| **supabase コマンドが見つかりません** | `pnpm dlx supabase` または `npx supabase` を使う。 |
| **connection refused** | ローカル DB 未起動なら `supabase start`。リモートなら `--db-url "$DB_URL"` を指定する。 |
