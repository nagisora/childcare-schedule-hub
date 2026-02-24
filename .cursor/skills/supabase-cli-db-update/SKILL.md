---
name: supabase-cli-db-update
description: Supabase CLI で DB を更新する手順。supabase コマンドが見つからない場合の実行方法、SUPABASE_DB_PASSWORD の取得、マイグレーション適用のワークフローを案内する。Use when working with Supabase migrations, db push, db diff, or when the user mentions "supabase コマンドが見つかりません" or needs to update the database schema.
---

# Supabase CLI で DB 更新

## 重要: supabase コマンドの実行方法

`supabase` コマンドが PATH にない場合、**直接 `supabase` を叩かず**、以下のいずれかを使う:

```bash
pnpm dlx supabase <サブコマンド>
```

または（pnpm が使えない場合）:

```bash
npx supabase <サブコマンド>
```

例: `pnpm dlx supabase db push`、`pnpm dlx supabase --version`

## SUPABASE_DB_PASSWORD の取得

`SUPABASE_DB_PASSWORD` は `.env.local` に格納されている。このプロジェクトでは `apps/web/.env.local`。

**隠しファイルの参照**: `.env.local` は隠しファイルだが、Read ツールや grep でパス指定すれば参照可能。

- Read ツール: `apps/web/.env.local` を読み、`SUPABASE_DB_PASSWORD=` の行から値を抽出
- ターミナルで取得: `grep '^SUPABASE_DB_PASSWORD=' apps/web/.env.local | cut -d= -f2- | tr -d '"'`

**環境変数として渡す例**:

```bash
export SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
```

## リモート DB へのマイグレーション適用フロー

1. **project-ref を取得**: `NEXT_PUBLIC_SUPABASE_URL` から抽出。  
   `https://<project-ref>.supabase.co` の `<project-ref>` 部分。

   ```bash
   grep '^NEXT_PUBLIC_SUPABASE_URL=' apps/web/.env.local | sed 's|.*https://||; s|\.supabase\.co.*||'
   ```

2. **リンク（初回または未リンク時）**:

   ```bash
   export SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
   pnpm dlx supabase link --project-ref <project-ref> --password "$SUPABASE_DB_PASSWORD"
   ```

3. **マイグレーション適用**:

   ```bash
   export SUPABASE_DB_PASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' apps/web/.env.local | cut -d= -f2- | tr -d '"')
   pnpm dlx supabase db push --password "$SUPABASE_DB_PASSWORD"
   ```

## よく使うコマンド

| 操作 | コマンド |
|------|----------|
| マイグレーション適用（リモート） | `pnpm dlx supabase db push --password "$SUPABASE_DB_PASSWORD"` |
| スキーマ差分をマイグレーション生成 | `pnpm dlx supabase db diff --schema public > supabase/migrations/$(date +%Y%m%d%H%M%S)_<name>.sql` |
| リモートとリンク | `pnpm dlx supabase link --project-ref <ref> --password "$SUPABASE_DB_PASSWORD"` |
| マイグレーション整合性チェック | `pnpm dlx supabase db lint` |
| ローカル Supabase 起動 | `pnpm dlx supabase start` |
| ローカル Supabase 停止 | `pnpm dlx supabase stop` |

## 実行前チェックリスト

- [ ] プロジェクトルート（`supabase/` があるディレクトリ）で実行する
- [ ] `apps/web/.env.local` に `SUPABASE_DB_PASSWORD` が設定されている
- [ ] リモート push の場合は `supabase link` 済みであること

## トラブルシューティング

**「Access token not provided」**: `supabase link` 実行前に Supabase へのログインが必要。  
`pnpm dlx supabase login` を実行し、ブラウザで認証する。

**「supabase コマンドが見つかりません」**: 必ず `pnpm dlx supabase` または `npx supabase` を使う。グローバルインストールは不要。

**「connection refused」**（db lint など）: ローカル DB に接続しようとしている。ローカル未起動の場合は `supabase start` を先に実行するか、リモート用の操作（link + db push）を行う。
