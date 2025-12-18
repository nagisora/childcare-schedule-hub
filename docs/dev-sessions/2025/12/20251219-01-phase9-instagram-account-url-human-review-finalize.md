# チェックリスト式実装計画書: 2025-12-19

> **セッションとは**: このプロジェクトにおける「セッションの定義」は `docs/dev-sessions/session-definition.md` を参照。

## セッション概要とゴール

### 概要

- 一言サマリ: **残りの未特定（8件）を人間が確認**して、`instagram_url` の運用上の未処理を0件にする（確定 or 未特定確定）
- 対応フェーズ: フェーズ9
- セッション種別: 運用（人間レビュー） + 必要なら最小実装 + 検証 + ドキュメント更新
- 実行方式: ペア（人間レビューあり）
- 影響範囲: `apps/scripts`（CLI更新/ログ） / `facilities.instagram_url`（DB更新） / `docs/dev-sessions` / `docs/05-09-instagram-account-url-coverage.md`
- 日付: 2025-12-19
- 想定所要時間: 45〜120 分

### ゴール

- **ゴール**: `instagram_url` の **未設定（= 未レビュー/未処理）を0件**にする（人間による確認まで完了）
  - 完了条件:
    - [ ] 未特定8件について、**人間が候補の妥当性を確認**し、採用/不採用（=未特定確定）を決めて記録している
    - [ ] 採用できるものは `facilities.instagram_url` を更新できている（更新証跡・ロールバック可能）
    - [ ] 採用できないものは「未特定確定（理由つき）」として一覧化され、次回以降に再調査が必要か判断できる
    - [ ] `docs/05-09-instagram-account-url-coverage.md` と本dev-sessionに、結果と証跡リンクが反映されている

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9正本）
- 参照: `docs/dev-sessions/2025/12/20251218-01-phase9-instagram-account-url-coverage-finish.md`（前日：一次ソース抽出+検索補完まで完了）
- 参照: `apps/scripts/instagram-semi-auto-registration.ts`（更新CLI）
- 参照: `apps/web/app/api/instagram-search/route.ts`（検索API）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - 「未設定=未処理」をなくすのが目的。DBがNULLのままでも、**人間が確認して“存在しない/不明”を確定**できれば「処理済み」とみなす（ただし理由は必ず残す）
  - 誤登録の方が害が大きいので、迷ったら **未特定確定**に倒す
  - シークレット（APIキー/トークン）は絶対に表示・ログ出力しない
- 議論概要:
  - 前日までに 61施設中53件まで `instagram_url` を設定済み。残り8件はレビュー待ち。

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & 実行内容（運用・ドキュメント更新）

- [ ] タスク1: 未特定8件のレビュー（候補採用 or 未特定確定）を完了する
  - 完了条件: 8件すべてについて「採用/未特定確定（理由つき）」が決まっている
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/scripts/logs/instagram-review-2025-12-18-01-18-20.md
      - docs/dev-sessions/2025/12/20251218-01-phase9-instagram-account-url-coverage-finish.md
    - やりたいこと:
      - まず low_score 2件（遊モア柳原 / おうす）を人間が確認し、候補採用の可否を決める
      - no_candidates 6件は、施設名 + 区 + 子育て支援拠点 で手動検索し、公式アカウントがあるか確認
      - 「存在しない/不明」と判断した場合は、理由をこのdev-sessionに記録（再調査が必要かも明記）
    - 制約・注意点:
      - 誤登録禁止（迷ったら未特定確定）
      - 個人情報/認証情報の入力は行わない
    ```

- [ ] タスク2: 採用分のみ DB 更新（ロールバック可能な証跡つき）
  - 完了条件: 採用すると決めた施設の `instagram_url` が更新され、バックアップ/ログが残っている
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/scripts/instagram-semi-auto-registration.ts
      - apps/scripts/logs/instagram-backup-*.json（前回分も含む）
    - やりたいこと:
      - レビューで採用したURLのみ、対象facilityIdに対してDB更新する（必要なら小さなスクリプトで一括更新）
      - 更新前バックアップを確実に残す
    - 制約・注意点:
      - 一括更新は対象IDを限定する
      - 更新後に品質チェック（ドメイン/投稿URL/クエリ残り/重複）を再実施
    ```

- [ ] タスク3: ドキュメント反映（フェーズ9正本・本dev-session）
  - 完了条件: 正本とdev-sessionに「未特定確定一覧」「証跡リンク」「最終カバレッジ」が反映されている
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - docs/05-09-instagram-account-url-coverage.md
      - docs/dev-sessions/2025/12/20251219-01-phase9-instagram-account-url-human-review-finalize.md（本ファイル）
    - やりたいこと:
      - 未特定確定の施設一覧（理由つき）を記載
      - 「未設定（未レビュー/未処理）0件」を根拠とともに記載
    ```

### 2. 検証・テスト（確認方法）

- [ ] 確認1: DB上の `instagram_url IS NULL` の残件が「レビュー済み（理由つき）」として本dev-sessionに記載されている
      - 期待結果: 「未レビュー/未処理」が0件
- [ ] 確認2（任意）: `mise exec -- pnpm --filter web test`
      - 期待結果: テストがすべてパスする

---

## 実施ログ

- スタート: TODO: HH:MM
- 参照ログ:
  - 前回レビューサマリ: `apps/scripts/logs/instagram-review-2025-12-18-01-18-20.md`
- メモ:
  - TODO

## 結果とふりかえり

- 完了できたタスク:
  - [ ] タスク1
  - [ ] タスク2
  - [ ] タスク3
- 未完了タスク / 想定外だったこと:
  - TODO
- 学び・次回改善したいこと:
  - TODO

## 次回に持ち越すタスク

- なし（このセッションで「未レビュー/未処理」を0件にする）
***

## 付録（任意）

- メモ: 正本は `docs/05-09-instagram-account-url-coverage.md`
