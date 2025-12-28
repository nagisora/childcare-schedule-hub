---
name: phase11-design-polish
overview: フェーズ11の「デザイン修正」セッション（UI一貫性/レスポンシブ/A11y）を、既存機能の挙動を変えずに仕上げるための実行Planです。代表画面は `/` と `/facilities/[id]` の2ルートを中心に、共通スタイルを整理してから各コンポーネントを微調整します。
todos:
  - id: audit-ui
    content: ローカルで代表ページの現状を確認し、UIのばらつき（色/タイポ/余白/ボタン/状態表示）を短いチェックリストに落とす
    status: pending
  - id: layout-foundation
    content: 共通レイアウト（最大幅/背景/余白）を `layout.tsx` 側に寄せ、`globals.css` の `main` 依存を解消して全ページの土台を安定化する
    status: pending
    dependencies:
      - audit-ui
  - id: unify-components
    content: 状態表示/リンク/ボタン（focus-visible含む）を共通スタイルに寄せ、`/` のHero/お気に入り/拠点一覧の見た目を一貫させる
    status: pending
    dependencies:
      - layout-foundation
  - id: polish-detail
    content: "`/facilities/[id]` の通常/エラー/NotFoundを共通トーンに揃え、リンク/カード/余白/見出しの一貫性を取る"
    status: pending
    dependencies:
      - layout-foundation
  - id: responsive-a11y-check
    content: 指定ビューポート（375/390/428/768/1024/1280/1920）とキーボード操作で確認し、崩れ・横スクロール・focus問題を潰す
    status: pending
    dependencies:
      - unify-components
      - polish-detail
  - id: session-log
    content: セッションファイルに結果（変更方針・確認ビューポート・指摘と修正）を記録し、タスク1〜3を完了にする
    status: pending
    dependencies:
      - responsive-a11y-check
---

# フェーズ11 デザイン/UX仕上げ（2025-12-28 セッション用 Plan）

## ゴールとスコープ

- **対象**: `docs/dev-sessions/2025/12/20251228-01-phase11-design-polish.md` のタスク1〜3（UI一貫性 / レスポンシブ / A11y）
- **代表ページ（実体）**:
- `/`（トップ + お気に入り + 拠点一覧）: [`apps/web/app/page.tsx`](apps/web/app/page.tsx)
- `/facilities/[id]`（拠点詳細 + error/not-found）: [`apps/web/app/facilities/[id]/page.tsx`](apps/web/app/facilities/[id]/page.tsx)
- **制約**:
- **機能挙動は変えない**（デザイン/UX/A11yの改善のみ）
- お気に入り最大件数到達時の通知は **現状維持（`alert()`）**
- 検証は **ローカル環境**で実施

## 作業方針（先に土台→次に各ページ）

### 1) 現状把握（短時間で差分を作る）

- ローカル起動: `mise exec -- pnpm --filter web dev`
- 代表フローを一通り触って、以下をメモ（セッションファイルの「実施ログ」に追記）
- `/`：Hero / お気に入り0件 / お気に入り複数件 / スケジュール表示（成功/失敗/未登録） / 拠点一覧テーブル
- `/facilities/[id]`：通常 / not-found / error
- 「ばらつき」の一覧を作る（例: 角丸、影、余白、リンク色、ボタンfocus、カード背景、見出しサイズ）

### 2) レイアウトと共通スタイルの整理（最重要）

狙いは、**今の `globals.css` の `main { ... }`（最大幅/白背景/角丸）が、ページ単位のTailwind指定と競合している状態**を解消し、全ページの見た目を安定させることです。

- 変更対象:
- [`apps/web/app/layout.tsx`](apps/web/app/layout.tsx)
- [`apps/web/app/globals.css`](apps/web/app/globals.css)
- 実施内容（例）:
- `layout.tsx` で **共通の外枠**（背景色・左右padding・最大幅・中央寄せ）を付与
- `globals.css` の **要素セレクタ `main` によるレイアウト支配を撤廃**（ページ側の `max-w-*` を正しく効かせる）
- `@layer components` 等で、最低限の共通スタイルを定義
    - `card`（白背景 + border + 角丸 + shadow）
    - `link`（色/下線/hover/focus-visible）
    - `button`（focus-visible ringの統一）
- 既存の `.btn-add/.btn-remove/.btn-move` は残しつつ、**focusを `:focus-visible` に寄せて視認性と一貫性**を上げる

### 3) `/`（トップ + お気に入り + 拠点一覧）の磨き込み

- 変更対象（主）:
- [`apps/web/app/page.tsx`](apps/web/app/page.tsx)
- [`apps/web/components/HeroSection.tsx`](apps/web/components/HeroSection.tsx)
- [`apps/web/components/FavoritesSection.tsx`](apps/web/components/FavoritesSection.tsx)
- [`apps/web/components/FavoriteFacilityCard.tsx`](apps/web/components/FavoriteFacilityCard.tsx)
- [`apps/web/components/MonthSelector.tsx`](apps/web/components/MonthSelector.tsx)
- [`apps/web/components/FacilitiesTable.tsx`](apps/web/components/FacilitiesTable.tsx)
- （状態表示系）[`apps/web/components/EmptyState.tsx`](apps/web/components/EmptyState.tsx), [`apps/web/components/ErrorAlert.tsx`](apps/web/components/ErrorAlert.tsx), [`apps/web/components/LoadingSpinner.tsx`](apps/web/components/LoadingSpinner.tsx)
- 実施内容（例）:
- セクション見出し/余白/カード表現（border, shadow, radius）を統一
- お気に入り0件時のUIを `EmptyState` に寄せて、空状態のトーンを統一
- `MonthSelector` のボタンを他ボタンと同等の見た目・focus-visibleに統一
- `FacilitiesTable` の
    - 区ナビのpillスタイルとfocus-visible
    - テーブルの横スクロールが「テーブル枠だけ」で起きることの担保
    - モバイルでのタップターゲット（行高/ボタンサイズ）確認

### 4) `/facilities/[id]`（詳細 + error/not-found）の磨き込み

- 変更対象:
- [`apps/web/app/facilities/[id]/page.tsx`](apps/web/app/facilities/[id]/page.tsx)
- [`apps/web/app/facilities/[id]/error.tsx`](apps/web/app/facilities/[id]/error.tsx)
- [`apps/web/app/facilities/[id]/not-found.tsx`](apps/web/app/facilities/[id]/not-found.tsx)
- 実施内容（例）:
- 戻るリンク/外部リンクの色・hover・focus-visibleを統一
- エラー/NotFoundのカードUIを `ErrorAlert` と整合するトーンに寄せる（赤系の使い方、余白、見出しサイズ）

### 5) Instagram埋め込み周りの見た目 & A11y微調整

- 変更対象:
- [`apps/web/components/InstagramEmbed.tsx`](apps/web/components/InstagramEmbed.tsx)
- （必要なら）[`apps/web/app/globals.css`](apps/web/app/globals.css)
- 実施内容（例）:
- 失敗/無効URLフォールバックのカード表現・リンク表現を他と統一
- `aria-*` の整合（装飾は `aria-hidden`、リンクは必要なら `aria-label`）

## 検証手順（完了条件に直結）

### レスポンシブ（指定幅）

- DevToolsで以下の幅を順に確認: **375 / 390 / 428 / 768 / 1024 / 1280 / 1920**
- チェック:
- 意図しない横スクロールがない（テーブル枠の `overflow-x-auto` は許容）
- テキストが読める（折り返し/行間/余白が破綻しない）
- ボタンが押しやすい（特に `+`/`−`、月切替、解除）

### A11y（キーボード）

- 代表フロー（キーボードのみ）:
- `/` で拠点一覧へ移動 → `+` でお気に入り追加 → お気に入りカードで月切替 →（埋め込み/リンク）操作
- チェック:
- focus-visible が常に見える
- focus順序が論理的（見出し→操作→次セクション）
- `ErrorAlert` / `LoadingSpinner` / `StatusMessage` の `aria-live` が期待通り

### コントラスト

- Lighthouse / axe-core（可能なら）で **4.5:1** を満たすことを確認
- 結果はセッションファイルに「どのページ/どの指摘/どう直したか」を短く記録

## 仕上げ（任意だが推奨）

- `mise exec -- pnpm --filter web lint`
- `mise exec -- pnpm --filter web typecheck`
- `mise exec -- pnpm --filter web test`

## 成果物（セッションファイル更新）