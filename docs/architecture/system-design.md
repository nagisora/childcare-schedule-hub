# システム全体構成 (System Design)

本システム（Childcare Schedule Hub）の全体像・アーキテクチャについて記述します。

## プロジェクト構造（Monorepo）

本リポジトリは `pnpm` を使用した Monorepo 構成となっています。

- `apps/web/`
  - Next.js (App Router) を用いたメインのWebアプリケーション。
  - フロントエンド UI、API Routes (Instagram検索、データ登録) などを内包。
- `apps/scripts/`
  - データ収集や一括登録などのバッチ処理用スクリプト群（Node.js + TypeScript）。
- `supabase/`
  - データベースマイグレーションファイル (`migrations/`) などを管理。

## 技術スタック

| 領域 | 技術・ツール |
| --- | --- |
| **Framework** | Next.js (App Router), React |
| **Language** | TypeScript |
| **Package Manager** | pnpm (>= 10.x) |
| **Database / Backend** | Supabase (PostgreSQL, Authentication) |
| **Styling** | Tailwind CSS |
| **Testing** | Vitest (Unit), Playwright (E2E), Testing Library |
| **Linter / Formatter** | Biome (段階導入中), ESLint, Prettier (移行予定) |
| **Hosting** | Vercel (予定), Supabase Cloud |

## 全体アーキテクチャ・データフロー

1. **ユーザー向け画面**
   - クライアントコンポーネント (React) が localStorage と連携して「お気に入り」を管理。
   - 登録されたお気に入りの拠点のスケジュールを Supabase から取得し表示。
2. **管理者向け画面・API (`apps/web/app/admin/`)**
   - Basic認証で保護された管理者用フォーム。
   - `route.ts` (API) 経由で Instagram URL の取得・検索・正規化を実行し、Supabase にスケジュールを upsert。
3. **バッチスクリプト (`apps/scripts/`)**
   - 外部サイト（名古屋市公式や各拠点サイト）からのスクレイピング。
   - スケジュールの一括登録やバックアップ復元などを CLI で実行。

## 主要な設計方針
- **サーバーサイド/クライアントサイドの分離**: `useFavoritesSync` などのカスタムフックを用いて、localStorage (クライアント固有) と Supabase (サーバー連携) の状態をFacadeパターンで隠蔽・管理。
- **機能の共通化**: URL正規化 (`instagram-url.ts`) や拠点名クレンジング (`facility-name-utils.ts`) のロジックは、Web 側と Script 側で同じ処理を通す。
- **段階的移行**: 開発環境ツール (Formatterなど) は、変更差分の肥大化を防ぐために段階適用するアプローチを採用（例: Biome の部分適用）。
