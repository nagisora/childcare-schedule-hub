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

- [x] タスク1: 未特定8件のレビュー（候補採用 or 未特定確定）を完了する
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

- [x] タスク2: 採用分のみ DB 更新（ロールバック可能な証跡つき）
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

- [x] タスク3: ドキュメント反映（フェーズ9正本・本dev-session）
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

- [x] 確認1: DB上の `instagram_url IS NULL` の残件が「レビュー済み（理由つき）」として本dev-sessionに記載されている
      - 期待結果: 「未レビュー/未処理」が0件
- [x] 確認2（任意）: `mise exec -- pnpm --filter web test`
      - 期待結果: テストがすべてパスする → **112件すべてパス**

---

## 実施ログ

- スタート: 2025-12-19 15:02 (JST)
- 参照ログ:
  - 前回レビューサマリ: `apps/scripts/logs/instagram-review-2025-12-18-01-18-20.md`
- メモ:
  - タスク1: 未特定8件のレビューを実施
    - low_score 2件の確認:
      - 遊モア柳原: 候補 `npo.mamekko` を採用（NPOまめっこのアカウントで、遊モア（柳原・平安通・あじま）を運営）
      - おうす: 候補 `higashiyama_saryo` は誤検出（京都の茶寮）→ 未特定確定
    - no_candidates 6件の手動検索:
      - すべての施設について、施設名 + 区 + 子育て支援拠点で検索を実施
      - 検索結果: Instagramアカウントが見つからず、存在しない可能性が高い
      - 未特定確定: くれよんぱ～く、くれよんひろば、ほっこりワクワクはなのこ広場、めだかひろば、けいわKiddyルーム、ふれあいセンターおおだか

## 結果とふりかえり

### 最終確認結果

- **DB上の `instagram_url IS NULL` 件数**: 7件
- **未レビュー/未処理**: 0件（すべてレビュー済みで「未特定確定」として記録）
- **未特定確定施設**: 7件（すべて本dev-sessionに理由つきで記録済み）

### レビュー結果サマリ

#### 採用決定（1件）
- **遊モア柳原** (施設ID: `f07a0f19-56a7-4b72-a80e-1ecd004dd164`)
  - 採用URL: `https://www.instagram.com/npo.mamekko/`
  - 理由: NPOまめっこのアカウントで、遊モア（柳原・平安通・あじま）を運営しているため正しい候補と判断

#### 未特定確定（7件）
- **おうす** (施設ID: `6243b018-95e2-4298-bc89-5af4436fe8a9`)
  - 理由: 候補 `higashiyama_saryo` は京都の茶寮で誤検出。名古屋市港区の子育て支援拠点「おうす」のInstagramアカウントは見つからず
  - 再調査: 必要（施設名が短いため検索が困難。公式サイトや詳細ページの確認を推奨）

- **くれよんぱ～く** (施設ID: `595eaca3-041a-4053-8e04-9015dd155b78`, 中村区)
  - 理由: 施設名 + 区 + 子育て支援拠点で検索したが、Instagramアカウントが見つからず
  - 再調査: 任意（公式サイトや詳細ページの確認を推奨）

- **くれよんひろば** (施設ID: `2b9f5d21-54dc-4867-ba2d-8e3f3b290ff8`, 中村区)
  - 理由: 施設名 + 区 + 子育て支援拠点で検索したが、Instagramアカウントが見つからず
  - 再調査: 任意（公式サイトや詳細ページの確認を推奨）

- **ほっこりワクワクはなのこ広場** (施設ID: `421c6907-8492-4cea-87ef-b92e49648488`, 千種区)
  - 理由: 施設名 + 区 + 子育て支援拠点で検索したが、Instagramアカウントが見つからず
  - 再調査: 任意（公式サイトや詳細ページの確認を推奨）

- **めだかひろば** (施設ID: `bbe9d62b-301f-4dff-ba3f-2bca6e130167`, 守山区)
  - 理由: 施設名 + 区 + 子育て支援拠点で検索したが、Instagramアカウントが見つからず
  - 再調査: 任意（公式サイトや詳細ページの確認を推奨）

- **けいわKiddyルーム** (施設ID: `93029435-74a0-4559-ab24-2a98aa6fa8f2`, 港区)
  - 理由: 施設名 + 区 + 子育て支援拠点で検索したが、Instagramアカウントが見つからず
  - 再調査: 任意（公式サイトや詳細ページの確認を推奨）

- **ふれあいセンターおおだか** (施設ID: `82ca437b-f5c5-4dea-8ce3-45e44b7e685b`, 緑区)
  - 理由: 施設名 + 区 + 子育て支援拠点で検索したが、Instagramアカウントが見つからず
  - 再調査: 任意（公式サイトや詳細ページの確認を推奨）

### 完了できたタスク
- [x] タスク1: 未特定8件のレビュー完了
  - 採用: 1件（遊モア柳原）
  - 未特定確定: 7件（理由つき）
- [x] タスク2: 採用分のDB更新完了
  - 更新対象: 遊モア柳原 (施設ID: `f07a0f19-56a7-4b72-a80e-1ecd004dd164`)
  - 更新URL: `https://www.instagram.com/npo.mamekko/`
  - バックアップ: `apps/scripts/logs/instagram-backup-2025-12-19-15-02-00.json`
- [x] タスク3: ドキュメント反映完了
  - 正本（`docs/05-09-instagram-account-url-coverage.md`）に未特定確定一覧と最終カバレッジを反映
  - 本dev-sessionにレビュー結果を記録
- [x] タスク6: Runbook整備とデータ品質チェック完了（**追加実施: 当初の計画には含まれていなかったが、ユーザーからの要望により実施**）
  - `docs/instagram-integration/04-runbook.md` にGoogle Custom Search APIを使った標準フローを追加
  - `docs/instagram-integration/05-instagram-account-search.md` に標準フローとフォールバック手順を整理
  - データ品質チェック実施（結果は下記「データ品質チェック結果」参照）
- [x] タスク7: 自動テスト整備の現状確認完了（**追加実施: 当初の計画には含まれていなかったが、ユーザーからの要望により実施**）
  - 既存テスト: `apps/web/__tests__/instagram-search.test.ts` に42件のテストが実装済み
  - テスト実行結果: 112件すべてパス（`mise exec -- pnpm --filter web test`）
  - カバレッジ: `generateSearchQueries`, `normalizeInstagramUrl`, `scoreCandidate`, `processSearchResults`, `processSearchResultsRank`, `processSearchResultsHybrid` の主要分岐をカバー

### 未完了タスク / 想定外だったこと
- なし（タスク1〜3はすべて完了）
- **追加実施したタスク**: タスク6（Runbook整備とデータ品質チェック）とタスク7（自動テスト整備の現状確認）は、当初の計画には含まれていなかったが、ユーザーからの要望により本セッションで実施した

### データ品質チェック結果（2025-12-19実施）

| チェック項目 | 結果 | 備考 |
|---|---|---|
| Instagramドメイン以外 | ✅ 0件 | すべて正しいドメイン |
| 投稿URL混入（/p/, /reel/等） | ✅ 0件 | すべてプロフィールURL |
| クエリパラメータ/フラグメント残り | ✅ 0件 | すべて正規化済み |
| 重複URL | ⚠️ 3件（意図的） | 同一団体の複数拠点（`npo.mamekko`: 3件、`npo.nijiiro`: 2件、`oyakokko_minato`: 2件） |

### テスト現状確認結果（タスク7）

- **既存テストファイル**: `apps/web/__tests__/instagram-search.test.ts`
- **テスト件数**: 42件（`generateSearchQueries`: 4件、`normalizeInstagramUrl`: 8件、`scoreCandidate`: 6件、`processSearchResults`: 3件、`processSearchResultsRank`: 9件、`processSearchResultsHybrid`: 12件）
- **テスト実行結果**: 112件すべてパス（`mise exec -- pnpm --filter web test`）
- **カバレッジ範囲**:
  - ✅ `generateSearchQueries`: 正常系・異常系・境界値（括弧・特殊文字・短い施設名）
  - ✅ `normalizeInstagramUrl`: 正常系・異常系（投稿URL・リールURL・クエリパラメータ・フラグメント・Instagram以外のドメイン）
  - ✅ `scoreCandidate`: 正常系・異常系・境界値（スコア計算・誤検出防止）
  - ✅ `processSearchResults`: 正常系・異常系（スコア閾値・投稿URL除外）
  - ✅ `processSearchResultsRank`: 正常系・異常系（順位維持・重複除外・limit）
  - ✅ `processSearchResultsHybrid`: 正常系・異常系（スコア降順・重複除外・limit）
- **不足しているテスト**:
  - `apps/web/app/api/instagram-search/route.ts` のAPI Routeテスト（外部依存のモックが必要）
  - `apps/scripts/instagram-semi-auto-registration.ts` のテスト（CLIツールのテスト環境が必要）

### 学び・次回改善したいこと
- 短い施設名（おうす等）は誤検出リスクが高いため、追加の文脈情報（区名+子育て文脈）が重要
- 手動検索でも見つからない施設は、Instagramアカウントが存在しない可能性が高い
- 未特定確定の施設については、公式サイトや詳細ページの確認を推奨
- Google Custom Search APIを使った標準フローが確立され、Runbookに反映された
- データ品質チェックにより、意図的な重複（同一団体の複数拠点）以外の問題は検出されなかった

## 次回に持ち越すタスク

- なし（このセッションで「未レビュー/未処理」を0件にする）
***

## 付録（任意）

- メモ: 正本は `docs/05-09-instagram-account-url-coverage.md`
