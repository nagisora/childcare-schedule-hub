# チェックリスト式実装計画書: 2025-12-19

> **セッションとは**: このプロジェクトにおける「セッションの定義」は `docs/dev-sessions/session-definition.md` を参照。

## セッション概要とゴール

### 概要

- 一言サマリ: フェーズ9関連コードを**仕様変更なしで安全にリファクタ**し、次フェーズへ進む前に「壊れていない」を自動テストで担保する
- 対応フェーズ: フェーズ9
- セッション種別: リファクタリング + 検証
- 実行方式: AI自律
- 影響範囲: `apps/web/lib/instagram-search.ts` / `apps/web/app/api/instagram-search/route.ts` / （必要なら）`apps/scripts/instagram-semi-auto-registration.ts`
- 日付: 2025-12-19
- 想定所要時間: TODO: 45〜120 分

### ゴール

- **ゴール**: フェーズ9のリファクタを終え、`mise exec -- pnpm --filter web test` が通る状態を維持する
  - 完了条件:
    - [x] `apps/web/lib/instagram-search.ts` の責務・命名・重複が整理され、読みやすい構造になっている（挙動は不変）
      - 第1段階として過剰なコメント・冗長チェックを削除し、可読性を向上（第2段階は見送り）
    - [x] `apps/web/app/api/instagram-search/route.ts` が必要なら最小限リファクタされ、分岐が把握しやすい（挙動は不変）
      - 第1段階として過剰なコメントを削除（第2段階は見送り）
    - [x] `mise exec -- pnpm --filter web test` がパスする
  - 補足:
    - 検索の採用基準/スコアリング変更など「仕様変更」はやらない

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9 正本）
- 参照: `docs/dev-sessions/2025/12/20251219-02-phase9-instagram-account-url-final-check-refactor.md`（最終チェック + Routeテスト補強）
- 参照（コード）:
  - `apps/web/lib/instagram-search.ts`
  - `apps/web/app/api/instagram-search/route.ts`
  - `apps/web/__tests__/instagram-search.test.ts`
  - `apps/web/__tests__/instagram-search-route.test.ts`

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - リファクタの目的は「次フェーズへ進む前の負債返済」であり、**挙動は変えない**
  - 変更範囲をフェーズ9関連に限定し、テストを壊さない（壊れたら修正してから先へ）
  - シークレット（APIキー/トークン）は絶対に表示・ログ出力しない
- 保留中の論点 / 今回は触らないと決めたこと:
  - 「再検索抑制キャッシュ」の設計/実装は別途（影響が大きい）

---

## 実装チェックリスト（本セッションにおける）

### 0. 事前確認（差分の把握）

- [x] `git diff main...HEAD --name-only` で変更ファイル一覧を取得
- [x] `git diff main...HEAD` で具体的な差分を確認

### 1. 作業タスク & 実行内容（第1段階: remove-ai-code-slop）

- [x] タスク1: main との差分から「AIっぽいスロップ」を除去（挙動不変）
  - 完了条件: 次のような“過剰さ”が差分から消えている（挙動は不変）
    - 不自然に丁寧すぎるコメント/注意書き
    - その箇所の設計に比べて過剰な defensive check / try/catch
    - `any` キャストなど「型エラー回避のための逃げ」
    - そのファイルの既存スタイルと不整合な記述
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 対象: git diff main...HEAD に含まれる変更（特にアプリコード）
    - やること:
      - AIっぽいスロップ（過剰コメント/防御コード/anyキャスト等）を削除
      - 仕様・外部I/F・エラーレスポンス形は変えない
      - 最終的にテストが通る状態を維持（落ちたら原因を潰してから次へ）
    ```

### 2. 作業タスク & 実行内容（第2段階: refactor-plan）

- 方針: フェーズ9完了の判断として、第2段階は実施しない（MVPではこれ以上のリファクタをしない）

- [x] （見送り）タスク2-1: `apps/web/lib/instagram-search.ts` のリファクタ（挙動不変）
  - 完了条件: 命名/責務/重複が整理され、既存ユニットテストがそのまま通る
  - 進め方（重要）:
    - まず `git diff main...HEAD` を前提に「対象ファイル一覧 & 変更概要」を提示する
    - **ユーザー承認後に** 実際のコード変更を適用する（大きい変更は段階的に）
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/web/lib/instagram-search.ts
      - apps/web/__tests__/instagram-search.test.ts
    - やりたいこと:
      - 関数ごとの責務が読み取りやすいように分割/並び替え/命名統一
      - 型（Candidate 等）の境界を明確化
      - 重複処理（例: URL除外や重複排除など）がある場合は共通化（挙動は変えない）
    - 制約・注意点:
      - 仕様変更禁止
      - テストが落ちたらその時点で原因を潰す
    ```

- [x] （見送り）タスク2-2: `apps/web/app/api/instagram-search/route.ts` の最小リファクタ（挙動不変）
  - 完了条件: 認証/入力/依存/戦略分岐の見通しが良くなり、既存テストが通る
  - 進め方（重要）:
    - まず `git diff main...HEAD` を前提に「対象ファイル一覧 & 変更概要」を提示する
    - **ユーザー承認後に** 実際のコード変更を適用する（大きい変更は段階的に）
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/web/app/api/instagram-search/route.ts
      - apps/web/__tests__/instagram-search-route.test.ts
    - やりたいこと:
      - 分岐（認証/入力/DB/外部依存/strategy）を整理し、早期returnの読みやすさを上げる
      - 必要なら小さな関数へ切り出し（テストを壊さない範囲）
    - 制約・注意点:
      - 仕様変更禁止
      - 例外・エラーレスポンスの code/message を変えない（テストに影響）
    ```

### 2. 検証・テスト（確認方法）

- [x] 確認1: `mise exec -- pnpm --filter web test`
      - 期待結果: テストがすべてパスする
      - 結果: 全123テスト通過（11テストファイル）
- [x] 確認2: `mise exec -- pnpm --filter web lint`
      - 期待結果: Lintエラーがない（`route.ts` の未使用変数 `error` 3箇所を修正）
      - 結果: Lintエラーなし（`mise exec -- pnpm --filter web lint` で確認済み）
- [ ] 確認3（任意）: `mise exec -- pnpm --filter web test:coverage`
      - 期待結果: カバレッジが取得できる

---

## 実施ログ
- スタート: 2025-12-19 15:45頃
- メモ:
  - 第1段階（remove-ai-code-slop）を実施
    - `apps/web/lib/instagram-search.ts`: 過剰なJSDoc・インラインコメント・不要なnullチェック（`(v ?? '').trim()` → `v.trim()`等）を削除、約200行削減
    - `apps/web/app/api/instagram-search/route.ts`: 冗長な説明コメントを削除（約30行削減）
    - `apps/web/__tests__/instagram-search-route.test.ts`: コメントを簡潔化
    - セッションドキュメントを2段階フロー（remove-ai-code-slop → refactor-plan）に更新
  - テスト: 全123テスト通過、Lintエラーなし
  - コミット:
    - `refactor: Instagram検索関連コードから過剰なコメントと冗長チェックを削除`（4342176）
    - `fix: /api/instagram-searchのLint未使用変数を解消`（66a5e1b）

## 結果とふりかえり

- 完了できたタスク:
  - [x] タスク1（第1段階: remove-ai-code-slop）: AIっぽいスロップ除去を完了
    - 過剰なコメント・JSDoc・冗長なnullチェックを削除し、約210行削減（64行追加、実質146行削減）
    - 挙動は変更なし、テスト全通過
  - [x] 確認1（テスト）: 全123テスト通過
  - [x] 確認2（Lint）: エラーなし
- 未完了タスク / 想定外だったこと:
  - なし（フェーズ9完了。第2段階は見送り）
- 学び・次回改善したいこと:
  - 第1段階のremove-ai-code-slopは事前に実施してよかった（コードがすっきりした）
  - 追加リファクタは、MVPに必要な範囲に絞って「やる/やらない」を先に決める

### Deferred（今回対応しないが記録する）

- `apps/scripts/instagram-semi-auto-registration.ts` の主要判断ロジックのテスト可能化は、全国対応でCLIを運用するタイミングで回収する（MVPでは使わないため見送り）
  - 追跡: `docs/20-deferred-work.md`（DW-006）/ Issue #29

## 次回に持ち越すタスク

- なし
***

## 付録（任意）

- メモ: 正本は `docs/05-09-instagram-account-url-coverage.md`

