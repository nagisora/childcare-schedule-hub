# チェックリスト式実装計画書: 2025-12-19

> **セッションとは**: このプロジェクトにおける「セッションの定義」は `docs/dev-sessions/session-definition.md` を参照。

## セッション概要とゴール

### 概要

- 一言サマリ: **フェーズ9の完了状況を最終チェック**し、必要な整理（未チェック項目の扱い確定）と **最低限の回帰テスト補強（API Route）**を行って、次フェーズへ進める状態にする（リファクタは次セッションへ分割）
- 対応フェーズ: フェーズ9
- セッション種別: 最終チェック（ドキュメント/進捗） + テスト補強 + 検証
- 実行方式: AI自律
- 影響範囲: `docs/05-09-instagram-account-url-coverage.md` / `apps/web/app/api/instagram-search/route.ts` / `apps/web/__tests__/instagram-search-route.test.ts` / `apps/web/__tests__/instagram-search.test.ts`（既存）
- 日付: 2025-12-19
- 想定所要時間: TODO: 45〜90分

### ゴール

- **ゴール**: フェーズ9を「完了」と宣言できる状態（正本の整合性 + 回帰テストOK）にする（リファクタは次セッションへ分割）
  - 完了条件:
    - [x] `docs/05-09-instagram-account-url-coverage.md` の進捗チェックリストが **「未チェック項目の扱い」まで含めて整合**している（例: 再検索抑制キャッシュは Deferred として回収先を明記）
    - [x] `apps/web/app/api/instagram-search/route.ts` について、外部依存（Google CSE）をモックした **最低限の分岐テスト**が追加されている
    - [x] `mise exec -- pnpm --filter web test` がパスする（**123 tests passed**）
    - [x] 主要な動作（検索API/正規化/戦略切替/CLIの最低限）が壊れていないことを確認できる（今回はテスト補強のみで、既存テストで担保）
  - 補足:
    - DB更新（`facilities.instagram_url` など）や本番相当の運用操作はこのセッションのスコープ外

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9 正本）
- 参照: `docs/05-00-development-phases.md`（フェーズ9/10の境界と次フェーズ条件）
- 参照: `docs/dev-sessions/2025/12/20251219-01-phase9-instagram-account-url-human-review-finalize.md`（直近の完了証跡）
- 参照（コード）:
  - `apps/web/lib/instagram-search.ts`
  - `apps/web/app/api/instagram-search/route.ts`
  - `apps/scripts/instagram-semi-auto-registration.ts`
  - `apps/web/__tests__/instagram-search.test.ts`

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - フェーズ9の主目的（InstagramアカウントURLの全面カバーと運用手順整備）は完了している前提で、**最終チェックとリファクタで「次フェーズへ進める状態」**に整える
  - `docs/05-09-instagram-account-url-coverage.md` に **未チェックの追加タスク（例: 再検索抑制キャッシュ）** が残っているため、今回の最終チェックで「やる/やらない（Deferredへ移管）」を明確化する
  - テストが通ることを最優先（`mise exec -- pnpm --filter web test`）
  - シークレット（APIキー/トークン）は絶対に表示・ログ出力しない
- 保留中の論点 / 今回は触らないと決めたこと:
  - Google CSE のコスト最適化や大規模な設計変更（例: キャッシュ戦略の刷新）は、必要なら別セッションで扱う

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & 実行内容（最終チェック・リファクタ）

- [x] タスク1: フェーズ9の「完了状況の最終チェック」と正本の整合性整理
  - 完了条件: `docs/05-09-instagram-account-url-coverage.md` の進捗チェックリストについて、未チェック項目の扱い（実装/Deferred）が説明可能になっている
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - docs/05-09-instagram-account-url-coverage.md
      - docs/05-00-development-phases.md
      - docs/dev-sessions/2025/12/20251219-01-phase9-instagram-account-url-human-review-finalize.md
    - やりたいこと:
      - フェーズ9の「全体の完了条件」が満たされていることを再確認し、証跡リンクが揃っているかチェック
      - 未チェックの追加タスク（例: 再検索抑制キャッシュ）がある場合は、
        - このセッションで実装する/しない（Deferredへ移管）を決め、ドキュメント上の扱いを整理する
      - 次フェーズ（フェーズ10）へ進む前提条件と、持ち越し（もしあれば）を「次回に持ち越すタスク」に集約する
    - 制約・注意点:
      - 正本（進捗管理の正本）は docs/05-09... を優先する
      - 「完了」の定義に曖昧さが残らないよう、未実施があるなら理由と移管先を明記する
    ```

- [x] タスク3: `apps/web/app/api/instagram-search/route.ts` の分岐テストを追加（外部依存をモック）
  - 完了条件: `apps/web/__tests__/instagram-search-route.test.ts` が追加され、主要な 400/401/404/500 分岐をカバーできている
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/web/app/api/instagram-search/route.ts
      - docs/05-09-instagram-account-url-coverage.md（タスク7の未実装項目: API Routeテスト）
    - やりたいこと:
      - Route Handler を最小の疑似 request で呼び出し、分岐テストを追加する（Google CSE は fetch をモック）
      - 追加後に `mise exec -- pnpm --filter web test` を実行し、パスを確認する
    - 制約・注意点:
      - 実キー/トークンをテストに埋め込まない（ダミー値のみ）
    ```

### 2. 検証・テスト（確認方法）

- [x] 確認1: `mise exec -- pnpm --filter web test`
      - 期待結果: テストがすべてパスする（**123 tests passed**）
- [x] 確認2（任意）: `mise exec -- pnpm --filter web test:coverage`
      - 期待結果: カバレッジが取得でき、主要ロジックの回帰が起きていないと判断できる
      - 結果: **77.74% カバレッジ取得成功**（主要ロジックはカバー済み）
- [x] 確認3（任意）: `mise exec -- pnpm --filter web lint`（存在する場合）
      - 期待結果: Lintエラーがない
      - 結果: **Lintエラーなし**（`route.ts` の未使用変数 `error` 3箇所は `20251219-03` で修正済み）

---

## 実施ログ

- スタート: 2025-12-19 15:20 頃（推定）
- メモ:
  - API Route テスト追加: `apps/web/__tests__/instagram-search-route.test.ts`
  - `mise exec -- pnpm --filter web test`: **123 tests passed**
  - `mise exec -- pnpm --filter web test:coverage`: **77.74% カバレッジ取得成功**
  - `mise exec -- pnpm --filter web lint`: **未使用変数エラー3箇所**（`route.ts` の `error` 変数。リファクタセッションで対応予定）
  - 正本の整合性整理:
    - `docs/05-09-instagram-account-url-coverage.md` の「再検索抑制キャッシュ」を Deferred（未実装）として回収先を明記（Issue #28 / `docs/20-deferred-work.md` DW-005）
    - `docs/05-00-development-phases.md` の「フェーズ進捗状況 / 次のステップ」を 2025-12-19 時点へ更新（フェーズ9完了・リファクタ中）

## 結果とふりかえり

- 完了できたタスク:
  - [x] タスク1: フェーズ9の「完了状況の最終チェック」と正本の整合性整理
  - [x] タスク3: `apps/web/app/api/instagram-search/route.ts` の分岐テストを追加（外部依存をモック）
- 未完了タスク / 想定外だったこと:
  - なし
- 学び・次回改善したいこと:
  - Route Handler の境界（認証/入力/外部依存/DB）の分岐テストを先に入れると、リファクタ前後の安心感が上がる

## 次回に持ち越すタスク

- [x] （持ち越し済み → `docs/dev-sessions/2025/12/20251219-03-phase9-instagram-account-url-refactor.md`）タスク2: フェーズ9関連コードのリファクタリング（読みやすさ/責務分離/重複削減）
- [x] （持ち越し済み → `docs/20-deferred-work.md` DW-005 / Issue #28）再検索抑制キャッシュは Deferred（未実装）として回収先へ移管済み
- [x] （見送り → `docs/20-deferred-work.md` DW-006 / Issue #29）`apps/scripts/instagram-semi-auto-registration.ts` の主要判断ロジックをテスト可能に切り出し
  - 背景: 将来的に全国対応でCLIを運用する想定だが、MVPではCLIを使用しないため今回は対応しない

***

## 付録（任意）

- メモ: フェーズ計画の正本は `docs/05-00-development-phases.md`（索引）と `docs/05-09-instagram-account-url-coverage.md`（詳細計画）
