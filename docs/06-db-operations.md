# 06 DB セットアップ & 手動オペレーション

## 1. ドキュメント情報
| 項目 | 内容 |
| --- | --- |
| バージョン | 0.1.0 |
| 最終更新日 | 2025-11-19 |
| 作成責任者 | Childcare Schedule Hub 開発チーム |
| 対象読者 | 開発者（特にフェーズ3のセットアップを行う人） |
| 参照元 | [02 設計資料](./02-design.md)、[04 開発ガイド](./04-development.md)、[05 開発フェーズ](./05-development-phases.md) |

本書は、**Supabase MCP を用いた AI 実行を基本とし**、必要に応じて人間が手動で実行するための Supabase データベースのセットアップ手順と、よく使う DB 操作コマンドをまとめます。

**重要**: 本書は、Cursor + Supabase MCP を使った AI 実行をデフォルト経路として想定しています。MCP を利用できない環境では、人間がターミナルや Supabase Studio で実行する手順としても利用できます。テーブル定義の詳細は [02 設計資料](./02-design.md) 3.3 節を、開発全体の流れは [04 開発ガイド](./04-development.md) と [05 開発フェーズ](./05-development-phases.md) を参照してください。

## 2. Supabase MCP を使う場合の共通フロー

フェーズ3の DB セットアップは、**基本的に Cursor + Supabase MCP を用いて AI が実行し、人間は指示と確認を行う**ことが推奨されます。

### 2.1 AI への依頼パターン

以下のような指示を Cursor のチャットで行うことで、AI が Supabase MCP 経由で DB 操作を実行します：

- **テーブル作成**: 「Supabase MCP を使って開発用プロジェクトで `facilities` テーブルを作成して」  
  または「`docs/06-db-operations.md` の 2.3 節に従って `facilities` と `schedules` テーブルを作成して」
- **サンプルデータ投入**: 「`facilities` テーブルにサンプルデータを 3 件投入して」
- **環境変数確認**: 「現在の Supabase プロジェクトの環境変数設定を確認して」

### 2.2 AI に任せるべき操作と人間が判断すべき操作

**AI に任せるべき操作（MCP で実行）:**
- 開発用プロジェクトでのテーブル作成・インデックス作成・RLS ポリシー設定
- 開発用プロジェクトでのサンプルデータ投入・削除
- スキーマの確認・テーブル一覧の取得
- 開発用プロジェクトでのマイグレーション実行

**人間が判断すべき操作（手動実行または慎重な指示）:**
- 本番プロジェクトへの直接的なスキーマ変更（マイグレーションの最終実行）
- 本番データの削除・更新操作
- プロジェクト作成・削除・組織管理
- セキュリティポリシーの最終決定

### 2.3 安全性の考慮事項

Supabase MCP を利用する際は、以下の安全性方針に従ってください（参考: [Supabase MCP 公式ドキュメント](https://supabase.com/docs/guides/getting-started/mcp)）：

1. **開発用プロジェクトでの利用を推奨**: 原則として、開発・テスト用の Supabase プロジェクトに MCP を接続してください。
2. **本番プロジェクトに接続する場合**: 本番プロジェクトに接続する場合もあり得ますが、その際は以下の対策を講じてください:
   - **読み取り専用モード** を設定し、書き込み操作を制限する
   - **プロジェクトスコープ** を設定し、他のプロジェクトにアクセスできないようにする
   - **ブランチ環境** を利用し、本番スキーマを直接変更しない
3. **Cursor でのツールコール手動承認**: Cursor の設定で、すべてのツールコールを手動承認する設定を有効にしてください。AI が実行する SQL の内容を必ず確認してから承認するようにしてください。
4. **機密データの保護**: 本番データに接続する場合は、機密情報（個人情報、パスワードなど）が含まれていないか事前に確認してください。

## 3. 初回セットアップ（フェーズ3）

フェーズ3の代表フロー「拠点一覧 → スケジュール表示 → お気に入り」を動作させるため、以下の手順を順番に実行してください。

**注意**: 以下の手順は、AI（Cursor + Supabase MCP）が実行しても、人間が自分で実行してもよい「標準手順書」です。MCP を利用する場合は、[2. Supabase MCP を使う場合の共通フロー](#2-supabase-mcp-を使う場合の共通フロー) に従って AI に依頼してください。

### 3.1 Supabase プロジェクトの作成・設定

1. Supabase ダッシュボード（https://app.supabase.com）にアクセス
2. 新しいプロジェクトを作成（プロジェクト名・データベースパスワードを設定）
3. プロジェクトが作成されるまで待機（数分かかります）

### 3.2 環境変数の取得と設定

1. Supabase プロジェクトのダッシュボードで、左メニューから **Settings**（歯車アイコン） > **API** を開く
2. 以下の値を取得:
   - **Project URL**（ページ上部の「Project URL」欄） → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key（「Project API keys」セクションの「anon public」行の「Reveal」ボタンをクリック） → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key（「Project API keys」セクションの「service_role」行の「Reveal」ボタンをクリック） → `SUPABASE_SERVICE_ROLE_KEY`
     - **注意**: `service_role` key は絶対にクライアント側（ブラウザ）に公開してはいけません

3. `apps/web/env.local.example` を `apps/web/.env.local` にコピー:
   ```bash
   cd apps/web
   cp env.local.example .env.local
   ```

4. `.env.local` に取得したキーを設定:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI..."
   ```

詳細: [04 開発ガイド](./04-development.md) 3.2 節を参照

### 3.3 テーブル作成

#### facilities テーブル作成

**手順 A: Supabase SQL Editor で実行（推奨）**

1. Supabase プロジェクトのダッシュボードにアクセス（https://app.supabase.com）
2. 左メニューから **SQL Editor** を開く
3. 以下の SQL を実行:

```sql
-- pgcrypto 拡張を有効化（UUID 生成に必要）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- facilities テーブル作成
CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text NOT NULL,
  address text NOT NULL,
  phone text,
  instagram_url text,
  website_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- エリア別検索向けのインデックス
CREATE INDEX IF NOT EXISTS idx_facilities_area ON public.facilities (area);

-- RLS（Row Level Security）を有効化（公開読み取り・管理者書き込み）
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーは読み取り可能
CREATE POLICY "Allow public read access" ON public.facilities
  FOR SELECT
  USING (true);

-- 管理者のみ書き込み可能（ポストMVP で実装）
-- CREATE POLICY "Allow admin write access" ON public.facilities
--   FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');
```

**手順 B: Supabase Studio の Table Editor で手動作成**

1. Supabase プロジェクトのダッシュボードにアクセス（https://app.supabase.com）
2. 左メニューから **Table Editor** を開く
3. **New Table** をクリック
4. テーブル名: `facilities`
5. 以下のカラムを追加:
   - `id` (uuid, Primary Key, Default: `gen_random_uuid()`)
   - `name` (text, Not Null)
   - `area` (text, Not Null)
   - `address` (text, Not Null)
   - `phone` (text, Nullable)
   - `instagram_url` (text, Nullable)
   - `website_url` (text, Nullable)
   - `created_at` (timestamptz, Default: `now()`)
   - `updated_at` (timestamptz, Default: `now()`)

#### schedules テーブル作成

`facilities` テーブル作成後、`schedules` テーブルを作成します。

**手順 A: Supabase SQL Editor で実行（推奨）**

1. Supabase SQL Editor を開く（上記 `facilities` テーブル作成と同じ手順）
2. 以下の SQL を実行:

```sql
-- schedules テーブル作成
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  instagram_post_url text,
  embed_html text,
  published_month date NOT NULL,
  status text DEFAULT 'published',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (facility_id, published_month)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_schedules_facility_month_desc ON public.schedules (facility_id, published_month DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_created_at ON public.schedules (created_at DESC);

-- RLS（Row Level Security）を有効化（公開読み取り・管理者書き込み）
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーは読み取り可能
CREATE POLICY "Allow public read access" ON public.schedules
  FOR SELECT
  USING (true);

-- 管理者のみ書き込み可能（ポストMVP で実装）
-- CREATE POLICY "Allow admin write access" ON public.schedules
--   FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');
```

**手順 B: Supabase Studio の Table Editor で手動作成**

1. Supabase プロジェクトのダッシュボードにアクセス（https://app.supabase.com）
2. 左メニューから **Table Editor** を開く
3. **New Table** をクリック
4. テーブル名: `schedules`
5. 以下のカラムを追加:
   - `id` (uuid, Primary Key, Default: `gen_random_uuid()`)
   - `facility_id` (uuid, Not Null, Foreign Key → `facilities.id`, On Delete: Cascade)
   - `image_url` (text, Not Null)
   - `instagram_post_url` (text, Nullable)
   - `embed_html` (text, Nullable)
   - `published_month` (date, Not Null)
   - `status` (text, Default: `'published'`)
   - `notes` (text, Nullable)
   - `created_at` (timestamptz, Default: `now()`)
   - `updated_at` (timestamptz, Default: `now()`)
6. **Unique Constraint** を追加:
   - `(facility_id, published_month)` の組み合わせで一意制約を設定

**注意事項:**
- `schedules` テーブルは `facilities` テーブルへの外部キー制約があるため、`facilities` テーブル作成後に作成してください
- テーブル定義の詳細は [02 設計資料](./02-design.md) 3.3 節を参照

#### favorites テーブルについて（ポストMVP）

`favorites` テーブルはポストMVPで導入予定です（MVP ではクライアント側クッキーのみで管理）。

ポストMVPで `favorites` テーブルを作成する場合は、[02 設計資料](./02-design.md) 3.3 節のテーブル定義と [02 設計資料](./02-design.md) 3.4 節の RLS ポリシー定義を参照してください。

### 3.4 サンプルデータの投入

#### facilities テーブルへのサンプルデータ投入（必須）

フェーズ3の代表フロー「拠点一覧 → スケジュール表示 → お気に入り」を検証するため、`facilities` テーブルに最低 3 件のデータが必要です。

**手順 A: Supabase Studio で手動投入（推奨・簡易）**

1. Supabase プロジェクトのダッシュボードにアクセス（https://app.supabase.com）
2. Table Editor > `facilities` テーブルを開く
3. Insert > Insert row から以下の 3 件を追加:

| name | area | address | phone | instagram_url | website_url |
| --- | --- | --- | --- | --- | --- |
| 中区子育て支援センター | 中区 | 〒460-0001 名古屋市中区三の丸1-1-1 | 052-123-4567 | (任意) | (任意) |
| 西区子育て応援拠点 | 西区 | 〒451-0065 名古屋市西区名駅2-27-8 | 052-234-5678 | (任意) | (任意) |
| 東区地域子育て支援拠点 | 東区 | 〒461-0005 名古屋市東区東桜2-13-32 | 052-345-6789 | (任意) | (任意) |

**注意事項:**
- `id` は UUID で自動生成される（手動で設定しない）
- `phone` / `instagram_url` / `website_url` は NULL 可なので、空欄でも可
- `created_at` / `updated_at` は自動的に設定される

**手順 B: SQL で直接投入（Supabase SQL Editor）**

以下の SQL を Supabase SQL Editor で実行:

```sql
-- facilities テーブルに代表フロー検証用のサンプルデータを投入
INSERT INTO public.facilities (name, area, address, phone, instagram_url, website_url)
VALUES
  ('中区子育て支援センター', '中区', '〒460-0001 名古屋市中区三の丸1-1-1', '052-123-4567', NULL, NULL),
  ('西区子育て応援拠点', '西区', '〒451-0065 名古屋市西区名駅2-27-8', '052-234-5678', NULL, NULL),
  ('東区地域子育て支援拠点', '東区', '〒461-0005 名古屋市東区東桜2-13-32', '052-345-6789', NULL, NULL);
```

#### schedules テーブルへのサンプルデータ投入（任意）

MVP の代表フローでは `schedules` のデータは必須ではありませんが、将来的な拠点詳細ページでのスケジュール表示を検証する場合は、以下のサンプルデータを投入できます。

**手順 A: Supabase Studio で手動投入**

1. Supabase プロジェクトのダッシュボードにアクセス（https://app.supabase.com）
2. Table Editor > `schedules` テーブルを開く
3. Insert > Insert row から以下のレコードを追加（`facilities` テーブルの `id` を参照）:
   - `facility_id`: `facilities` テーブルから取得したIDを選択
   - `image_url`: `https://example.com/schedule-2025-11.jpg`（ダミーURL）
   - `published_month`: `2025-11-01`（対象月の1日）
   - `status`: `published`
   - `instagram_post_url`, `embed_html`, `notes` は空欄でも可

**手順 B: SQL で直接投入（Supabase SQL Editor）**

以下の SQL を Supabase SQL Editor で実行（`facilities` テーブルにデータが存在する前提）:

```sql
-- schedules テーブルに代表フロー検証用のサンプルデータを投入（任意）
INSERT INTO public.schedules (facility_id, image_url, published_month, status)
SELECT 
  id as facility_id,
  'https://example.com/schedule-2025-11.jpg' as image_url,
  '2025-11-01'::date as published_month,
  'published' as status
FROM public.facilities
LIMIT 3;
```

**注意事項:**
- `schedules` テーブルのサンプルデータは MVP の代表フロー検証には必須ではありません
- 将来的な拠点詳細ページ（`/facilities/[id]`）でスケジュール表示を実装する際に必要になります
- `image_url` は実際の Supabase Storage URL またはダミーURLを使用してください

### 3.5 動作確認

1. 開発サーバーを起動:
   ```bash
   mise exec -- pnpm --filter web dev
   ```

2. ブラウザで `http://localhost:3000` を開き、以下を確認:
   - 拠点一覧が表示される
   - 「+」ボタンでお気に入り追加ができる
   - 上部の「お気に入り拠点」エリアに追加された拠点が表示される

## 4. Supabase MCP（Cursor 連携）

Supabase MCP（Model Context Protocol）を使うことで、Cursor などの AI アシスタントが Supabase プロジェクトに直接アクセスし、DB 操作を実行できます。このプロジェクトでは、**DB セットアップのデフォルト経路として Supabase MCP を推奨**します。

### 4.1 Cursor への Supabase MCP 導入手順

#### 方法 A: 1-Click インストール（推奨）

1. [Supabase MCP 公式ドキュメント](https://supabase.com/docs/guides/getting-started/mcp) にアクセス
2. **Cursor** を選択し、「Add to Cursor」ボタンをクリック
3. 設定が自動的に `.cursor/mcp.json` に追加されます

#### 方法 B: 手動設定

1. `.cursor/mcp.json` ファイルを作成または編集（プロジェクトルートに配置）
2. 以下の最小設定を追加:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

3. Cursor を再起動して設定を反映

### 4.2 初回認証フロー

1. Cursor で Supabase MCP を使用するコマンドを初めて実行すると、ブラウザウィンドウが自動的に開きます
2. Supabase アカウントにログインします
3. 組織アクセスを許可する画面が表示されるので、**許可（Authorize）** をクリックします
4. これにより、Cursor が Supabase プロジェクトにアクセスできるようになります

### 4.3 CI 環境での利用（オプション）

CI 環境で Supabase MCP を使う場合は、Personal Access Token (PAT) を使用します：

1. [Supabase Access Tokens](https://app.supabase.com/account/tokens) にアクセス
2. 新しいトークンを生成（例: "CI MCP Token"）
3. `.cursor/mcp.json` に以下のようにトークンを追加:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=${SUPABASE_PROJECT_REF}",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

**注意**: CI 環境では、環境変数 `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` を設定してください。また、**本番データに接続しないよう注意**してください。

### 4.4 よくある操作例

MCP を利用したよくある操作は、[2.1 AI への依頼パターン](#21-aiへの依頼パターン) を参照してください。

詳細: [Supabase MCP 公式ドキュメント](https://supabase.com/docs/guides/getting-started/mcp)

## 5. Supabase CLI の基本操作

Supabase CLI を使ったローカル開発環境のセットアップやマイグレーション管理を行う場合のコマンドです。

**注意**: 日常の DB 操作（テーブル作成・データ投入など）は Supabase MCP を優先してください。Supabase CLI は、スキーマ差分管理や CI でのマイグレーション整合性チェックなどに使用します。

### 5.1 ローカル開発環境

```bash
# プロジェクト初期化
supabase init

# ローカル Supabase 起動（Docker が必要）
supabase start

# ローカル Supabase 停止
supabase stop
```

### 5.2 マイグレーション管理

```bash
# スキーマ変更をマイグレーションファイルとして生成
supabase db diff --schema public > supabase/migrations/<timestamp>_<name>.sql

# ローカル DB に適用
supabase db push

# マイグレーション修復
supabase migration repair

# CI でのマイグレーション整合性チェック
supabase db lint
```

### 5.3 リモート連携

```bash
# リモート Supabase プロジェクトとリンク
supabase link --project-ref <project-ref-id>

# リンク済みプロジェクトでのリセット
supabase db reset --linked

# シードファイルをリモートに適用（注意: 本番データを上書きしないよう確認）
supabase db push --seed supabase/seed/initial_data.sql
```

### 5.4 シードファイル方式

より本格的な運用では、`supabase/seed/initial_data.sql` を作成し、以下のように実行します:

```bash
# ローカル Supabase の場合
supabase db reset --seed supabase/seed/initial_data.sql
```

シードファイルの例（`supabase/seed/initial_data.sql`）:
```sql
-- facilities: 名称/エリア/住所/Instagram URL を揃えた 3 件
INSERT INTO public.facilities (name, area, address, phone, instagram_url, website_url)
VALUES
  ('中区子育て支援センター', '中区', '〒460-0001 名古屋市中区三の丸1-1-1', '052-123-4567', NULL, NULL),
  ('西区子育て応援拠点', '西区', '〒451-0065 名古屋市西区名駅2-27-8', '052-234-5678', NULL, NULL),
  ('東区地域子育て支援拠点', '東区', '〒461-0005 名古屋市東区東桜2-13-32', '052-345-6789', NULL, NULL)
ON CONFLICT DO NOTHING;

-- schedules: 各拠点に最新月の画像 URL を 1 件（ポストMVPで追加）
-- ポストMVP: `favorites` のダミーデータ
```

詳細: [04 開発ガイド](./04-development.md) 4.2 節（マイグレーションフロー）を参照

---

**注意**: 本書の 3.x 節（初回セットアップ）の手順は、AI（Cursor + Supabase MCP）が実行しても、人間が自分で実行してもよい「標準手順書」です。MCP を利用する場合は、[2. Supabase MCP を使う場合の共通フロー](#2-supabase-mcp-を使う場合の共通フロー) を参照してください。

## 6. トラブルシューティング

### テーブルが存在しないエラー

- `ERROR: relation "public.facilities" does not exist` などのエラーが出る場合:
  - [3.3 テーブル作成](#33-テーブル作成) の手順を実行しているか確認してください
  - `facilities` → `schedules` の順で作成しているか確認してください（外部キー制約のため）

### 環境変数が設定されていないエラー

- `Missing Supabase environment variables` エラーが出る場合:
  - [3.2 環境変数の取得と設定](#32-環境変数の取得と設定) の手順を実行しているか確認してください
  - `apps/web/.env.local` ファイルが存在し、正しい値が設定されているか確認してください

### RLS ポリシーによるアクセスエラー

- `new row violates row-level security policy` エラーが出る場合:
  - [3.3 テーブル作成](#33-テーブル作成) の手順で RLS ポリシーが正しく作成されているか確認してください
  - 匿名読み取りポリシー（`Allow public read access`）が有効になっているか確認してください

## 7. 参考資料

- [02 設計資料](./02-design.md) 3.3 節: テーブル定義の詳細
- [02 設計資料](./02-design.md) 3.4 節: RLS ポリシーの詳細
- [04 開発ガイド](./04-development.md): 開発全体のガイドライン
- [05 開発フェーズ](./05-development-phases.md): フェーズ3の完了条件とチェックリスト

