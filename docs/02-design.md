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
- 画像/静的ホスティング: Supabase Storage + ホスティング基盤（現状: Vercel、本番デプロイ先はフェーズ8で再検討）
- インフラ運用: ホスティング基盤（現状: Vercel、CI/CD）、GitHub Actions（補助タスク）、Supabase バックエンド
  - 注: 本番デプロイ先の選定は [フェーズ8: デプロイ先の検討（コスト最適化）](./05-development-phases.md#フェーズ8-デプロイ先の検討コスト最適化) で実施。Cloudflare Pages などに変更する場合は、本節をアップデートすること。
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

### 3.1 ドメインモデル（ラフ）

MVP およびポストMVPを通じて中核となるドメインは次の通りとする。詳細なスキーマは後述のテーブル定義を単一ソースとし、本節では「どのエンティティがどのような役割を担うか」をラフに整理する。

- ユーザー（User）
  - 主に「保護者」「運用者/管理者」を想定。
  - MVP ではログイン機能を持たず、ユーザー識別はブラウザlocalStorage（`csh_favorites` など）による匿名IDで代替する。
  - ポストMVP で Supabase Auth を利用した `users` テーブルを導入し、`favorites` と紐付ける。
- 拠点（Facility）
  - 全国展開を前提とした子育て応援拠点・地域子育て支援拠点を表す中核エンティティ（MVP では名古屋市のデータを扱う）。
  - 名前・施設種別（`facility_type`）・全国対応の住所情報（都道府県コード・市区町村コード・区コード等）・電話・Instagram/公式サイト URL・詳細ページURL を保持し、一覧表示や検索の起点となる。
- スケジュール（Schedule）
  - 各拠点ごとの月次スケジュールを表す。Supabase Storage への画像 URL や Instagram 投稿 URL / 埋め込み HTML を紐付ける。
  - 「どの拠点の」「どの月の」スケジュールかを識別できればよい前提で、MVP では月単位の粒度とする。
- お気に入り（Favorite）
  - ユーザー（またはlocalStorage識別子）と拠点の多対多関係を表す。
  - MVP ではクライアント側localStorageのみで管理し、ポストMVP で `favorites` テーブルによる永続化・同期を行う。
- カレンダーソース / 外部連携（将来候補）
  - Instagram や将来の外部カレンダーソースを抽象化するエンティティ。
  - 現段階ではテーブル化せず、設計上のメモとして留める。

MVP でまず作成するテーブルは `facilities` / `schedules`（+ 将来を見据えた `favorites` の定義）とし、認証済みユーザーや高度な権限管理に関するテーブルはポストMVPで導入する。

### 3.2 ER 図コンセプト
```text
facilities (1) ──< schedules (n)
     │
     └──< favorites (n)
```

### 3.3 テーブル定義（MVP とポストMVP）
#### facilities（全国対応版・MVP 想定）

**重要**: 本テーブルは全国展開を前提としたスキーマです。MVP では名古屋市のデータのみを扱いますが、将来的に他自治体のデータも同じスキーマで管理できるように設計されています。

| カラム | 型 | 制約/既定値 | 用途 |
| --- | --- | --- | --- |
| id | uuid | PK, `gen_random_uuid()` | 拠点識別子（API では `facility_id`） |
| name | text | NOT NULL | 拠点名 |
| facility_type | text | NOT NULL | 施設種別（例: `childcare_ouen_base`, `childcare_support_base`） |
| **住所関連（全国対応）** | | | |
| prefecture_code | text | NULL 可 | 都道府県コード（JIS X 0401 等） |
| municipality_code | text | NULL 可 | 市区町村コード（JIS X 0402 等） |
| ward_code | text | NULL 可 | 政令指定都市の区コード（あれば） |
| postal_code | text | NULL 可 | 郵便番号 |
| prefecture_name | text | NULL 可 | 都道府県名（表示用） |
| city_name | text | NULL 可 | 市区町村名（表示用） |
| ward_name | text | NULL 可 | 区名（政令指定都市の場合、表示用・グルーピング用） |
| address_rest | text | NULL 可 | 丁目以降の住所 |
| address_full_raw | text | NULL 可 | スクレイピングで取得した住所の生文字列（元データ保持用） |
| **連絡先・URL** | | | |
| phone | text | NULL 可 | 連絡先。フォーマットは [03 API 仕様](./03-api.md) 参照 |
| instagram_url | text | NULL 可 | 公式 Instagram アカウント |
| website_url | text | NULL 可 | 公式サイト URL |
| detail_page_url | text | NULL 可 | 自治体サイト上の拠点詳細ページURL（スクレイピング元のリンク先） |
| **位置情報** | | | |
| latitude / longitude | numeric | NULL 可 | 地図表示用（将来拡張） |
| **メタデータ** | | | |
| created_at | timestamptz | `now()` | 作成日時 |
| updated_at | timestamptz | `now()` | 更新日時 |

推奨インデックスと補足:
- `CREATE INDEX idx_facilities_facility_type ON facilities (facility_type);`（施設種別検索向け）
- `CREATE INDEX idx_facilities_prefecture_code ON facilities (prefecture_code);`（都道府県別検索向け）
- `CREATE INDEX idx_facilities_municipality_code ON facilities (municipality_code);`（市区町村別検索向け）
- `CREATE INDEX idx_facilities_ward_name ON facilities (ward_name);`（区別検索・グルーピング向け）
- UUID 生成には `pgcrypto` 拡張を利用するため、Supabase プロジェクトで `CREATE EXTENSION IF NOT EXISTS pgcrypto;` を有効化する。

**エリア・住所の扱い**:
- UI上の「エリア」表示・グルーピングは `ward_name` を使用する。
- 住所の表示には `address_full_raw` を使用する（必要に応じて `address_rest` も利用可能）。
- フェーズ5で `facilities` テーブルは全国対応スキーマに拡張され、UI や新規 API では `ward_name` / `address_full_raw` ベースに統一する。一方、既存データや移行期間中の後方互換性のため、`area` / `address` カラムは当面のあいだ残置している（新規開発では `ward_name` / `address_full_raw` を優先して利用すること）。

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
| cookie_id | text | NULL 可 | MVP: localStorage識別子を保持（互換性のためカラム名は維持） |
| user_id | uuid | NULL 可 | ポストMVP: Supabase Auth ユーザー |
| sort_order | integer | `0` | 表示順序。クライアント側並び順を保持 |
| created_at | timestamptz | `now()` | 作成日時 |
| updated_at | timestamptz | `now()` | 更新日時 |

将来導入時の制約:
- 一意制約: `UNIQUE (cookie_id, facility_id)` / `UNIQUE (user_id, facility_id)`
- インデックス: `CREATE INDEX idx_favorites_cookie_sort ON favorites (cookie_id, sort_order);`

### 3.4 RLS ポリシーと単一ソース
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

### 3.5 状態管理方針
- App Router のサーバーコンポーネントでは初期データを取得し、クライアント側でlocalStorageからお気に入りを読み込んで初期状態を整形する。
- クライアント側のお気に入り操作はクライアントコンポーネントで管理し、`useOptimistic` 等を用いて UI を即時更新後にlocalStorageを書き換える。
- localStorage更新は `app/api/favorites` の Route Handler（将来追加）経由で行い、必要に応じて `revalidateTag('facilities')` を呼び出す。

### 3.6 セキュリティ対策（CSP 例）
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

### 4.1 MVP 代表画面フロー（拠点一覧 → スケジュール表示 → お気に入り）

MVP では、トップページを起点に「拠点一覧 → よく使う拠点（スケジュール表示を含むエリア）→ 詳細・将来機能」へ進む縦の 1 本を代表フローとする。非ログインの保護者がモバイルからアクセスし、よく利用する拠点を素早く見つけてスケジュールを確認できることを重視する。

- 代表フローのステップ:
  1. ユーザーがトップページ `/` にアクセスし、上部の「よく使う拠点」エリアと下部の「拠点一覧（テキスト表）」を閲覧する。
  2. 拠点一覧から最大 5 件までお気に入りに追加し、トップに固定された「よく使う拠点」エリアに表示させる（並び順はlocalStorage `csh_favorites` の `sortOrder` で管理）。
  3. 「よく使う拠点」から各拠点のスケジュール（画像/埋め込み、もしくはそのプレースホルダー）にアクセスし、必要に応じて将来の拠点詳細ページ（ポストMVP）へ遷移する。

### 4.2 画面構成（MVP）
1. **トップページ `/`**
   - 表示情報:
     - ヒーローセクション: サービス説明、将来の検索フォームプレースホルダー。
     - よく使う拠点（最大5件）: localStorage保存された拠点をカード/リストで表示。将来的にこのエリアでのみスケジュール画像/埋め込みを表示（MVP ではプレースホルダー可）。
     - 拠点一覧（テキスト表）: 拠点名 / エリア / 住所 / 電話 / 「+」ボタン（お気に入りに追加）。モバイルでは縦積み表示に崩す。スケジュール画像/埋め込みは一覧では表示しない。
   - 主要アクション:
     - 「+」ボタンで拠点をお気に入りに追加（最大 5 件まで）。
     - お気に入りエリア内で並び替え（ドラッグ&ドロップなど）を行い、`sortOrder` を更新。
     - （将来）お気に入りカードから拠点詳細ページへ遷移。
   - データ入出力:
     - 入力（読み取り）:
       - Supabase `facilities` テーブルから `id`, `name`, `ward_name`, `address_full_raw`, `phone`, `instagram_url`, `website_url`, `facility_type`, `detail_page_url` を取得（一覧表示用）。エリアは `ward_name` を使用し、住所は `address_full_raw` を使用する。将来の多都市展開時に区名（`ward_name`）や都道府県コード（`prefecture_code`）でフィルタしやすくする。
       - ブラウザlocalStorage `csh_favorites` から `facilityId` と `sortOrder` の配列を取得し、「よく使う拠点」エリアの表示順序と内容を決定。
     - 出力（書き込み）:
       - お気に入り追加/削除・並び替え時にlocalStorage `csh_favorites` を更新する（MVP では DB 書き込みは行わない）。
       - 将来拡張で `favorites` テーブルと同期する場合は、localStorage更新に加えて Edge Function 経由で DB を更新する（[03 API 仕様](./03-api.md) 参照）。
2. **拠点詳細ページ（ポストMVP） `/facilities/[id]`**
   - 表示情報:
     - 拠点の基本情報（`facilities`）と、月ごとのスケジュール画像/Instagram 埋め込み（`schedules`）をまとめて表示。
     - トップの「よく使う拠点」からの導線を設け、代表フロー上の「スケジュール表示」を担う画面とする。
   - 主要アクション:
     - 月の切り替え（`published_month`）によるスケジュールの変更。
     - スケジュール画像をタップして拡大、Instagram 投稿へ遷移など。
   - データ入出力:
     - 入力（読み取り）:
       - `facilities` から `id`, `name`, `ward_name`, `address_full_raw`, `phone`, `instagram_url`, `website_url`, `facility_type`, `detail_page_url` を取得。
       - `schedules` から `facility_id`, `image_url`, `instagram_post_url`, `embed_html`, `published_month`, `status` を取得し、対象月のスケジュールを表示。
     - 出力（書き込み）:
       - MVP / ポストMVP 初期では UI からの書き込みは行わず、運用者が Supabase Studio で登録する想定。
       - 将来的に管理者 UI を追加する際は、`schedules` の作成/更新 API を別途設計する。

### 4.3 MVP UI チェックリスト
- [ ] お気に入り操作: 「+」ボタンに適切なラベル/ARIA（`aria-label` 等）とフォーカス可視化を付与。
- [ ] 一覧表示: テキスト表の列幅/折り返し/モバイル崩しを確認（拠点名は強調、住所は折り返し）。
- [ ] エンプティステート: お気に入り未登録時の案内文と操作ヒントを表示。
- [ ] エラーハンドリング: Supabase 失敗時のトースト/アラートを定義。
- [ ] レイアウト: セクション間の余白、テーブルのスクロール挙動、モバイルでの可読性を確認。

### 4.4 アクセシビリティ配慮
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
      storage.ts
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
