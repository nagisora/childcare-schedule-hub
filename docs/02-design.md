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
- MVP: 拠点一覧は ISR (再生成間隔 60 分) を採用し、初回表示は 3 秒以内を目標とする（[01 要件定義](./01-requirements.md) の非機能要件と一致）。
- ポストMVP: Supabase Edge Functions での自動更新導入を想定し、結果をサーバーキャッシュで 5 分間保持する。失敗時は REST 経由のフォールバックを設ける。
- Instagram 埋め込みはキャッシュ不可のため、レイアウト最適化とプレースホルダー表示で UX を担保する。

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

#### schedules（MVP 想定）
| カラム | 型 | 制約/既定値 | 用途 |
| --- | --- | --- | --- |
| id | uuid | PK, `gen_random_uuid()` | スケジュール識別子 |
| facility_id | uuid | FK → facilities.id | 拠点との関連（ON DELETE CASCADE） |
| image_url | text | NOT NULL | Supabase Storage の公開 URL |
| instagram_post_url | text | NULL 可 | 埋め込み用 Instagram 投稿 URL |
| published_month | date | NOT NULL | 対象月の 1 日で管理 |
| status | text | `published` | 公開ステータス（`draft` / `archived` 等を想定） |
| notes | text | NULL 可 | 運用メモ |
| created_at | timestamptz | `now()` | 作成日時 |
| updated_at | timestamptz | `now()` | 更新日時 |

#### favorites（ポストMVP）
| カラム | 型 | 制約/既定値 | 用途 |
| --- | --- | --- | --- |
| id | uuid | PK, `gen_random_uuid()` | お気に入り識別子 |
| facility_id | uuid | FK → facilities.id | 拠点 ID |
| cookie_id | text | NOT NULL | MVP: クッキー識別子を保持 |
| user_id | uuid | NULL 可 | ポストMVP: Supabase Auth ユーザー |
| sort_order | integer | `0` | 表示順序。MVP ではクライアント側並び順を保持 |
| created_at | timestamptz | `now()` | 作成日時 |
| updated_at | timestamptz | `now()` | 更新日時 |

### 3.3 RLS と単一ソース
- `facilities` と `schedules` は公開読み取り、書き込みは管理者ロールに限定する。ポリシー定義は [04 開発ガイド](./04-development.md) に記載。
- `favorites` はポストMVP で RLS を有効化し、`cookie_id` または `user_id` によるフィルタリングを行う。
- フィールドの正規仕様は本章を単一ソースとし、[03 API 仕様](./03-api.md) は API 視点で要約・参照する。

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
