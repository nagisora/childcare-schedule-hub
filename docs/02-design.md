# 02 設計資料

## 1. ドキュメント情報
| 項目 | 内容 |
| --- | --- |
| バージョン | 0.2.0 |
| 最終更新日 | 2025-11-14 |
| 作成責任者 | Childcare Schedule Hub 設計チーム |
| 対象読者 | 開発チーム、プロダクトオーナー、デザイン担当 |
| 参照元 | [01 要件定義](./01-requirements.md)、[03 API 仕様](./03-api.md)、[04 開発ガイド](./04-development.md) |

本書は要件定義に基づきシステム構成・データモデル・ UI/UX の指針を提供する。仕様更新時は参照元との整合を確認し、差分は両方向に反映すること。

## 2. システムアーキテクチャ

### 2.1 構成概要
- クライアント: Next.js 14 (App Router) を利用した `apps/web`
- サーバー/API 層: Supabase REST / Edge Functions（MVP では REST 中心）
- 画像/静的ホスティング: Supabase Storage + Vercel
- インフラ運用: Vercel（CI/CD）、GitHub Actions（補助タスク）、Supabase バックエンド
- モノレポ管理: pnpm workspace（`apps/` と `packages/` を分離）

### 2.2 アーキテクチャ図
```text
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

### 2.3 キャッシュ戦略
- MVP: 拠点一覧は ISR（再生成間隔 60 分）を採用し、初回表示は 3 秒以内を目標とする（[01 要件定義](./01-requirements.md) の非機能要件と整合）。
- Supabase Edge Functions 経由のデータ取得にはサーバーサイドキャッシュ層を挟み、結果を 5 分間保持する。失敗時は REST API をフォールバックとして利用する。
- データ更新時は API もしくは管理者操作から `revalidateTag('facilities')` / `revalidateTag('schedules')` を呼び出し、ISR キャッシュを明示的に無効化する。
- Instagram 埋め込みはキャッシュ不可のため、公式ウィジェットの挙動を前提にレイアウト最適化とプレースホルダー表示で UX を担保し、CSP 設定でセキュリティを維持する。

## 3. データベース設計

### 3.1 ER 図コンセプト
```text
facilities (1) ──< schedules (n)
     │
     └──< favorites (n)
```

### 3.2 テーブル定義（MVP とポストMVP）
#### facilities（MVP 想定）
| カラム | 型 | 制約/既定値 | 用途 |
| --- | --- | --- | --- |
| id | uuid | PK, `gen_random_uuid()` | 拠点識別子（API では `facility_id`） |
| name | text | NOT NULL | 拠点名 |
| area | text | NOT NULL | 名古屋市の区などのエリア |
| address | text | NOT NULL | 郵便番号・住所 |
| phone | text | NULL 可 | 連絡先。フォーマットは [03 API 仕様](./03-api.md) 参照 |
| instagram_url | text | NULL 可 | 公式 Instagram アカウント |
| website_url | text | NULL 可 | 公式サイト URL |
| latitude / longitude | numeric | NULL 可 | 地図表示用（将来拡張） |
| created_at | timestamptz | `now()` | 作成日時 |
| updated_at | timestamptz | `now()` | 更新日時 |

推奨インデックスと補足:
- `CREATE INDEX idx_facilities_area ON facilities (area);`（エリア別検索向け）
- UUID 生成には `pgcrypto` 拡張を利用するため、Supabase プロジェクトで `CREATE EXTENSION IF NOT EXISTS pgcrypto;` を有効化する。

#### schedules（MVP 想定）
| カラム | 型 | 制約/既定値 | 用途 |
| --- | --- | --- | --- |
| id | uuid | PK, `gen_random_uuid()` | スケジュール識別子 |
| facility_id | uuid | FK → facilities.id | 拠点との関連（`ON DELETE CASCADE`） |
| image_url | text | NOT NULL | Supabase Storage の公開 URL |
| instagram_post_url | text | NULL 可 | 埋め込み用 Instagram 投稿 URL |
| embed_html | text | NULL 可 | oEmbed で取得した HTML（サニタイズ後に保存） |
| published_month | date | NOT NULL | 対象月の 1 日で管理（`UNIQUE (facility_id, published_month)`） |
| status | text | `'published'` | 公開ステータス（`draft` / `archived` 等を想定） |
| notes | text | NULL 可 | 運用メモ |
| created_at | timestamptz | `now()` | 作成日時 |
| updated_at | timestamptz | `now()` | 更新日時 |

制約・インデックス:
- 一意制約: `UNIQUE (facility_id, published_month)` で重複登録を防止する。
- インデックス:
  - `CREATE INDEX idx_schedules_facility_month_desc ON schedules (facility_id, published_month DESC);`
  - `CREATE INDEX idx_schedules_created_at ON schedules (created_at DESC);`

#### favorites（ポストMVP）
| カラム | 型 | 制約/既定値 | 用途 |
| --- | --- | --- | --- |
| id | uuid | PK, `gen_random_uuid()` | お気に入り識別子 |
| facility_id | uuid | FK → facilities.id | 拠点 ID |
| cookie_id | text | NULL 可 | MVP: クッキー識別子を保持 |
| user_id | uuid | NULL 可 | ポストMVP: Supabase Auth ユーザー |
| sort_order | integer | `0` | 表示順序。クライアント側並び順を保持 |
| created_at | timestamptz | `now()` | 作成日時 |
| updated_at | timestamptz | `now()` | 更新日時 |

将来導入時の制約:
- 一意制約: `UNIQUE (cookie_id, facility_id)` / `UNIQUE (user_id, facility_id)`
- インデックス: `CREATE INDEX idx_favorites_cookie_sort ON favorites (cookie_id, sort_order);`

### 3.3 RLS ポリシーと単一ソース
- `facilities` と `schedules` は公開読み取り、書き込みは管理者ロールに限定する。詳細なポリシー定義は [04 開発ガイド](./04-development.md) に記載し、本章を単一ソースとして参照する。
- Supabase の全テーブルで Row Level Security を有効化し、匿名ユーザーは読み取りのみ許可、管理者ロールのみ書き込みを許可する。
- 例: 管理者ロール判定は `auth.jwt()` のカスタムクレーム `app_metadata.role = 'admin'` を基準とし、Edge Function から JWT に `csh_cookie_id`（匿名ユーザー識別子）を注入する。

```sql
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
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

```sql
CREATE POLICY "facilities_public_read"
  ON public.facilities
  FOR SELECT
  USING (true);

CREATE POLICY "facilities_admin_write"
  ON public.facilities
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

```sql
CREATE POLICY "schedules_public_read"
  ON public.schedules
  FOR SELECT
  USING (true);

CREATE POLICY "schedules_admin_write"
  ON public.schedules
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

```sql
CREATE POLICY "favorites_cookie_read"
  ON public.favorites
  FOR SELECT
  USING (
    cookie_id = current_setting('request.jwt.claims.csh_cookie_id', TRUE)
    OR is_admin()
  );

CREATE POLICY "favorites_owner_write"
  ON public.favorites
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

### 3.4 状態管理方針
- App Router のサーバーコンポーネントで初期データを取得し、`cookies()` API からお気に入りクッキーを読み込んで初期状態を整形する。
- クライアント側のお気に入り操作はクライアントコンポーネントで管理し、`useOptimistic` 等を用いて UI を即時更新後にクッキーを書き換える。
- クッキー更新は `app/api/favorites` の Route Handler（将来追加）経由で行い、必要に応じて `revalidateTag('facilities')` を呼び出す。

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

## 4. UI/UX 設計

### 4.1 画面構成（MVP）
1. **トップページ**
   - ヒーローセクション: サービス説明、将来の検索フォームプレースホルダー。
   - お気に入りエリア: クッキー保存された拠点をカードで並べ替え表示。
   - 拠点グリッド: エリア別のカード一覧、各カードから最新スケジュールを参照。
2. **拠点詳細ページ（ポストMVP）**
   - 基本情報、スケジュール履歴、Instagram への導線。

### 4.2 MVP UI チェックリスト
- [ ] お気に入りボタン: アクセシブルなトグルボタンでステートを表示（ARIA `aria-pressed`）。
- [ ] スケジュール表示: 画像プレースホルダーと読み込みエラー時の代替テキストを用意。
- [ ] エンプティステート: データ未登録時に案内文と次のアクション（お問い合わせリンク等）を表示。
- [ ] エラーハンドリング: Supabase 失敗時のトースト/アラートを定義。
- [ ] レイアウト: `sm` / `md` / `lg` ブレイクポイントでカード列数を 1 → 2 → 3 に切り替え。

### 4.3 アクセシビリティ配慮
- キーボードフォーカスインジケータの表示とフォーカストラップ回避。
- 全ての画像と埋め込みに代替説明文を付与する（[01 要件定義](./01-requirements.md) の非機能要件を参照）。
- カラーコントラスト比 4.5:1 以上を満たすテーマを Tailwind カラーで定義。
- Instagram 埋め込み iframe には `title` 属性と操作説明を添付し、必要に応じて `next/script` で遅延読込を行う。

## 5. ディレクトリ構成
```text
apps/
  web/                      # 現在利用中
    app/
      page.tsx
      facilities/
        [id]/
          page.tsx
    components/
      FacilityCard.tsx
      InstagramEmbed.tsx
    lib/
      supabase.ts
      cookies.ts
packages/
  ui/                       # 共有 UI コンポーネント
  shared/                   # 型・ユーティリティ

# 追加予定（ポストMVP）
apps/
  admin/
    app/
      page.tsx
```
- `packages/ui`: Radix UI + Tailwind のラッパーコンポーネント。
- `packages/shared`: Zod スキーマ、型定義、共通ユーティリティ。
- 詳細なセットアップ手順は [04 開発ガイド](./04-development.md) を参照する。

## 6. 技術選定理由
- **Next.js 14**: App Router による柔軟なデータフェッチと ISR/キャッシュ機能 [[3]](#ref3)。
- **Supabase**: PostgreSQL + 認証・ストレージを一体提供し、無料枠で MVP 運用が可能 [[3]](#ref3)。
- **pnpm workspace**: 複数アプリケーション/パッケージ管理の効率化。
- **Tailwind CSS**: 一貫したデザインと迅速な UI 実装。
- **LLM 活用**: 設計資料に基づくコード自動生成で開発速度を向上 [[4]](#ref4)。

## 7. 将来拡張の指針
- 管理者画面を `apps/admin` として追加し、API 層を共通化する。
- AI 画像認識パイプラインは Supabase Edge Functions + 外部推論 API を想定し、ロールバック戦略を [01 要件定義](./01-requirements.md) のリスク一覧と連携させる。
- Progressive Web App 化や通知機能を検討し、ポストMVP で段階導入する。

## 8. 参考文献
- <a id="ref3"></a>[3] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref4"></a>[4] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
