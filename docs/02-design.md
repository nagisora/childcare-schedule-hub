# 02 設計資料

## 1. システムアーキテクチャ
- クライアント: Next.js 14 (App Router) を利用した `apps/web`
- API / データ層: Supabase (PostgreSQL + Edge Functions)
- 静的ホスティング/SSR: Vercel
- モノレポ管理: pnpm workspace（`apps/` と `packages/` を分離）

```
[Browser]
   │
   ▼
Next.js (App Router, ISR)
   │        │
   │        └─> Instagram Embed API (iframe)
   │
   └─> Supabase REST / Edge Function
                  │
                  └─> PostgreSQL + Storage
```

- キャッシュ戦略:
  - 拠点一覧ページは ISR (60 分) で再生成し、アクセス集中時にも低遅延を保つ [[3]](#ref3)
  - Supabase Edge Function 経由のデータ取得にはサーバーサイドキャッシュ層を挟み、結果を 5 分間保持
  - Instagram 埋め込みは公式ウィジェットを利用（キャッシュ不可のためレイアウト最適化で吸収）
  - データ更新時は API もしくは管理者操作から `revalidateTag('facilities')` / `revalidateTag('schedules')` を呼び出し、ISR キャッシュを明示的に無効化する

## 2. データベース設計
### 2.1 ER 図コンセプト
```
facilities (1) ──< schedules (n)
     │
     └──< favorites (n)
```

### 2.2 テーブル定義
#### `facilities`（拠点）

| カラム | 型 | 制約 | デフォルト | 備考 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | Supabase 既定の UUID 生成関数 |
| `name` | `text` | `NOT NULL` |  | 拠点名称 |
| `area` | `text` |  |  | 市区単位などのエリア情報 |
| `address` | `text` |  |  | 住所（任意） |
| `phone` | `text` |  |  | 電話番号（任意） |
| `instagram_url` | `text` |  |  | 公式 Instagram アカウント URL |
| `website_url` | `text` |  |  | 公式 Web サイト URL |
| `created_at` | `timestamptz` | `NOT NULL` | `now()` | Supabase 既定の行作成日時 |

推奨インデックス:

- `CREATE INDEX idx_facilities_area ON facilities (area);`（エリア別検索向け）
- UUID 生成には `pgcrypto` 拡張を利用するため、Supabase プロジェクトで `CREATE EXTENSION IF NOT EXISTS pgcrypto;` を有効化しておく。

#### `schedules`（拠点スケジュール）

| カラム | 型 | 制約 | デフォルト | 備考 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | |
| `facility_id` | `uuid` | `NOT NULL`, `REFERENCES facilities(id)` |  | 親拠点が削除された場合は `ON DELETE CASCADE` |
| `month` | `int` | `NOT NULL`, `CHECK (month BETWEEN 200001 AND 999912)` |  | `YYYYMM` 形式の対象月 |
| `image_url` | `text` |  |  | スケジュール画像のストレージ URL |
| `post_url` | `text` |  |  | 該当 Instagram 投稿の URL |
| `embed_html` | `text` |  |  | oEmbed で取得した HTML（サニタイズ後） |
| `created_at` | `timestamptz` | `NOT NULL` | `now()` | |

制約・インデックス:

- 一意制約: `UNIQUE (facility_id, month)` で重複登録を防止
- インデックス:
  - `CREATE INDEX idx_schedules_facility_month_desc ON schedules (facility_id, month DESC);`
  - `CREATE INDEX idx_schedules_created_at ON schedules (created_at DESC);`

#### `favorites`（お気に入り、MVP スコープ外）

MVP ではお気に入り情報をクッキーのみで保持し、データベースには保存しない。将来の多デバイス同期に備え、拡張仕様として設計を残す。

| カラム | 型 | 制約 | デフォルト | 備考 |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY` | `gen_random_uuid()` | |
| `user_id` | `uuid` |  |  | 認証ユーザー向け（将来対応） |
| `cookie_id` | `text` |  |  | 匿名ユーザー識別子 |
| `facility_id` | `uuid` | `NOT NULL`, `REFERENCES facilities(id)` |  | |
| `sort_order` | `smallint` |  |  | 並び順を表す整数 |
| `created_at` | `timestamptz` | `NOT NULL` | `now()` | |

将来導入時の制約:

- 一意制約: `UNIQUE (cookie_id, facility_id)` / `UNIQUE (user_id, facility_id)`
- インデックス: `CREATE INDEX idx_favorites_cookie_sort ON favorites (cookie_id, sort_order);`

### 2.3 RLS ポリシー
Supabase の全テーブルで Row Level Security を有効化し、匿名ユーザーは読み取りのみ許可、管理者ロールのみ書き込みを許可する。

```sql
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
```

#### 管理者ロール判定
- `auth.users` の `app_metadata.role = 'admin'` を基準とし、以下の関数で判定。

```sql
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'role') = 'admin',
    FALSE
  );
$$;
```

#### `facilities`（拠点）

```sql
CREATE POLICY "facilities_public_read"
  ON public.facilities
  FOR SELECT
  USING (true);

CREATE POLICY "facilities_admin_write"
  ON public.facilities
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

#### `schedules`（拠点スケジュール）

```sql
CREATE POLICY "schedules_public_read"
  ON public.schedules
  FOR SELECT
  USING (true);

CREATE POLICY "schedules_admin_write"
  ON public.schedules
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

- 親拠点の存在を保証するため、`facility_id` は外部キー制約で管理。削除は `ON DELETE CASCADE`。

#### `favorites`（お気に入り、将来対応）

```sql
CREATE POLICY "favorites_cookie_read"
  ON public.favorites
  FOR SELECT
  USING (
    cookie_id = current_setting('request.jwt.claims.csh_cookie_id', TRUE)
    OR is_admin(auth.uid())
  );

CREATE POLICY "favorites_owner_write"
  ON public.favorites
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
```

- MVP では `favorites` テーブルを利用しないため RLS は将来のための設計として記載。
- 匿名ユーザーのクッキー ID は Edge Function で JWT カスタムクレーム `csh_cookie_id` に注入する予定。

## 3. UI/UX 設計
### 3.1 画面構成
1. **トップページ**
   - ヒーローセクション: サービス説明、検索・フィルタ（将来拡張）
   - お気に入り枠: クッキー保存した拠点をカード表示
   - 拠点グリッド: エリアごとに拠点カードを表示
2. **拠点詳細ページ（将来）**
   - 基本情報、スケジュール履歴、関連リンク

### 3.2 ワイヤーフレーム概要
- スマートフォン: 1 カラム、カードは縦積み
- タブレット: 2 カラム、ヒーロー画像縮小
- デスクトップ: 3 カラム、Instagram 埋め込みはモーダル表示も検討

### 3.3 アクセシビリティ配慮
- ナビゲーションにキーボードフォーカスインジケータを表示
- 画像には代替テキストを設定し、Instagram 埋め込みには説明文を付与 [[3]](#ref3)

### 3.4 状態管理方針
- App Router のサーバーコンポーネントで初期データを取得し、`cookies()` API からお気に入りクッキーを読み込んで初期状態を整形する。
- クライアント側のお気に入り操作はクライアントコンポーネントで管理し、`useOptimistic` 等を用いて UI を即時更新後にクッキーを書き換える。
- クッキー更新は `app/api/favorites` の Route Handler （将来追加）経由で行い、必要に応じて `revalidateTag('facilities')` を呼び出す。

### 3.5 セキュリティ対策（CSP 例）
- 推奨 Content Security Policy:
  ```
  default-src 'self';
  script-src 'self' https://www.instagram.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://*.supabase.co data:;
  frame-src https://www.instagram.com https://www.facebook.com;
  connect-src 'self' https://*.supabase.co https://graph.facebook.com https://www.instagram.com;
  ```
- Instagram 埋め込み用の `iframe` には `sandbox="allow-scripts allow-same-origin"` を設定し、CSP と組み合わせてスクリプト実行範囲を最小限にする。

## 4. ディレクトリ構成（予定）
```
apps/
  web/
    app/
      page.tsx
      facilities/[id]/page.tsx
    components/
      FacilityCard.tsx
      InstagramEmbed.tsx
    lib/
      supabase.ts
      cookies.ts
packages/
  ui/
    Card/
    Button/
  shared/
    types/
      facility.ts
      schedule.ts
```
- `packages/ui`: Radix UI + Tailwind のラッパーコンポーネント
- `packages/shared`: Zod スキーマ、型定義、共通ユーティリティ

## 5. 技術選定理由
- **Next.js 14**: App Router による柔軟なデータフェッチと ISR/キャッシュ機能 [[3]](#ref3)
- **Supabase**: PostgreSQL ベースで認証・ストレージを統合提供。無料枠で MVP 運用が可能 [[3]](#ref3)
- **pnpm workspace**: 複数アプリケーション・パッケージを軽量に管理
- **Tailwind CSS**: 開発速度と一貫したデザイン適用
- **LLM 活用**: 設計資料に基づくコード生成で開発速度を向上 [[4]](#ref4)

## 6. 将来拡張の指針
- 管理者画面は `apps/admin` として追加し、API 層を共通化
- AI 画像認識パイプラインは Supabase Edge Functions + 外部推論 API を想定
- オフラインアクセスのために Progressive Web App 化を検討

## 7. 参考文献
- <a id="ref3"></a>[3] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref4"></a>[4] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
