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

## 2. データベース設計
### 2.1 ER 図コンセプト
```
facilities (1) ──< schedules (n)
     │
     └──< favorites (n)
```

### 2.2 テーブル定義
- `facilities`
  - 基本属性（名称、エリア、住所、連絡先、Instagram URL 等）
- `schedules`
  - 拠点ごとのスケジュール画像情報、Instagram 投稿リンク、対象月
- `favorites`
  - ユーザー ID（将来用）とクッキー ID、並び順

### 2.3 RLS ポリシー
- `facilities`: 公開読み取り可、書き込みは管理者ロールのみ
- `schedules`: 公開読み取り可、書き込みは管理者ロールのみ
- `favorites`: クッキー ID or ユーザー ID によるフィルタを設定（将来対応）

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
