# Childcare Schedule Hub ドキュメント

本プロジェクトの開発に関わるドキュメントのインデックスです。

過去に存在した長大な要件定義や設計ドキュメント、セッション記録等はメンテナンスコスト削減とAIへのコンテキストノイズ低減のためアーカイブ化されました。**現在の真の設計や仕様（正本）は「ソースコード」および「DBマイグレーションファイル」**にあります。

## 1. ドキュメント構成

現在の `docs/` ディレクトリは以下の通りシンプルに構成されています。

### 📌 アーキテクチャ・設計 (`docs/architecture/`)
現在のシステム構成や最新のデータベーススキーマについての概要です。

- **[システム全体構成 (`system-design.md`)](./architecture/system-design.md)**
  - 技術スタック、インフラ構成、システム全体のデータフロー
- **[データベーススキーマ (`database-schema.md`)](./architecture/database-schema.md)**
  - Supabase上に構築されているテーブル（`facilities`, `schedules` 等）のER図と役割

### 📌 開発ルール (`docs/rules/`)
開発を進める上での最低限のルールです。

- **[コーディング規約と運用方針 (`coding-guides.md`)](./rules/coding-guides.md)**
  - ディレクトリ構成の原則、AI（Cursor等）の運用方針、パッケージ管理（pnpm）について

### 📢 お知らせ・リリースノート (`docs/announcements/`)
機能追加やリリース記事などの公開用ドキュメント（ブログ用など）のドラフトや記録です。
### 📦 アーカイブ (`docs/archive/`)
過去の設計資料（`01-requirements.md`〜`20-deferred-work.md`）、開発セッション記録、検討ログなどが格納されています。通常、これらを参照する必要はありません。

---

## 2. 開発の始め方

開発環境のセットアップや日常の起動方法は以下の通りです。
（ランタイム管理ツール `mise` は任意導入です。パッケージマネージャーは必ず `pnpm` を使用してください）

```bash
# 1. パッケージのインストール
pnpm install

# 2. 開発サーバーの起動（Next.js Webアプリ）
pnpm --filter web dev

# 3. リント・フォーマット・型チェック
pnpm --filter web lint
pnpm --filter web typecheck
pnpm format
pnpm format:check
```

※ DBのセットアップや環境変数（Supabase連携など）が必要な場合は、プロジェクト内の `.env.local.example` を参考に構築してください。
