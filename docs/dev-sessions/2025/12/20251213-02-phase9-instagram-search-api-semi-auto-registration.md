# チェックリスト式実装計画書: 2025-12-13

> **重要（AI作業時）**: このファイルは `date +%Y%m%d` の結果（`20251213`）に基づいて作成している。  
> ルール: `docs/dev-sessions/README.md` / `docs/05-00-development-phases.md#dev-sessions-date`

## セッション概要とゴール

### 概要

- 一言サマリ: フェーズ9タスク4・5として、Google CSE を叩く Next.js 検索API PoC と、候補提示→採用/スキップの半自動登録ツール PoC を実装する
- 対応フェーズ: フェーズ9
- セッション種別: 実装
- 影響範囲: フェーズ9（InstagramアカウントURLの検索・登録フロー）
- 日付: 2025-12-13
- 想定所要時間: 60〜90 分（終わらなければタスク5を分割して次セッションへ）

### ゴール

- **ゴール**: 「東区（3件）」を題材に、検索APIで候補が返り、半自動ツールで採用/スキップの意思決定を安全に記録（または更新）できる状態まで到達する
  - 完了条件:
    - `/api/instagram-search`（PoC）がローカルで動作し、Google CSE の結果を正規化して返す
    - 半自動ツール（PoC）が `instagram_url IS NULL` の施設を対象に、候補提示→採用/スキップを1件以上通せる
    - **シークレット（APIキー等）をクライアントへ露出せず、ログにも出さない**（漏洩対策が入っている）
  - 補足:
    - DB更新（UPDATE）を実際に行うかは、ツール側に **DRY-RUN / 確認ステップ** を入れた上で実施する

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9詳細・タスク4/5要件）
- 参照: `docs/dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md`（対象区=東区、未登録3件）
- 参照: `docs/instagram-integration/03-design-decisions.md`（検索クエリ設計と判定ルール）
- 参照: `docs/instagram-integration/05-instagram-account-search.md`（検索API版ワークフロー）
- 参照: `docs/04-development.md` / `apps/web/env.local.example`（環境変数）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - 検索バックエンドは Google Custom Search API（CSE）を使用する
  - APIキー等は **サーバー側のみ**。レスポンス/ログ/例外にキー値を含めない
  - 登録する `instagram_url` は **プロフィールURLのみ**（`/p/`, `/reel/`, `?igsh=` 等は登録しない）。正規化は `https://www.instagram.com/<username>/` に統一する
  - 最初の対象は **東区（未登録3件）**（PoCとして小さく回す）
- 議論概要:
  - 公開APIのままだと第三者に叩かれて無料枠を消費するリスクがあるため、PoCでも最低限の防御（例: `NODE_ENV=production` では拒否、もしくは管理トークン必須）を入れる
- 保留中の論点 / 今回は触らないと決めたこと:
  - Runbook整備とデータ品質チェック（タスク6）は次回以降
  - 名古屋市全件の一括処理・日次上限制御は、PoCの結果を見てから拡張

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & プロンプト設計（実装・ドキュメント更新）

- [ ] タスク1: タスク4（検索API PoC）を `apps/web/app/api/instagram-search/route.ts` に実装
      - 完了条件: ローカルで `/api/instagram-search?facilityId=...` を叩くと、`[{ link, title, snippet, score }]` 形式の候補配列が返る（エラーは統一フォーマット）
      - **実行プロンプト案**:
        ```
        フェーズ9のタスク4として、Next.js の Route Handler で `/api/instagram-search` を PoC 実装してください。

        - 参照ファイル:
          - docs/05-09-instagram-account-url-coverage.md（タスク4の完了条件）
          - docs/dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md（東区の対象施設）
          - docs/instagram-integration/03-design-decisions.md（検索クエリ/判定ルール）
        - やりたいこと:
          - 入力は `facilityId`（優先）または `facilityName`+`wardName`
          - Google CSE をサーバー側で呼び出し、結果を正規化して `[{ link, title, snippet, score }]` を返す
          - 投稿URL（/p/ /reel/ /tv/ /stories/）や共有リンク（クエリ/フラグメント）は候補から除外し、プロフィールURLへ正規化する
          - 失敗時（400/500/外部APIエラー）は統一JSONで返す
        - 制約・注意点:
          - `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` はクライアントへ露出させない（レスポンス/ログに出さない）
          - 公開悪用でクエリ枠を消費されないよう、PoCでも最低限の防御（例: productionでは拒否 or 管理トークン必須）を入れる
        ```

- [ ] タスク2: タスク5（半自動登録ツール PoC）の設計確定と最小実装（まずは DRY-RUN）
      - 完了条件: `instagram_url IS NULL` の施設を対象に、候補提示→採用/スキップの記録が1件以上できる（最初はCSV/JSON出力でも可）
      - **実行プロンプト案**:
        ```
        フェーズ9のタスク5として、複数施設向け「半自動登録ツール」を PoC 実装してください。

        - 参照ファイル:
          - docs/05-09-instagram-account-url-coverage.md（タスク5の完了条件）
          - docs/dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md（東区の未登録3件）
        - やりたいこと:
          - 対象（例: 東区で `instagram_url IS NULL`）の施設を一覧化
          - 1件ずつ `/api/instagram-search` を叩いて上位候補を提示
          - 人間が「採用 / スキップ」を選べる（CLI or 管理ページ）
          - まずは安全のため DRY-RUN（更新せず、採用結果をJSON/CSVに出力）までを必須にする
          - 可能なら「確認ステップ付き」で `facilities.instagram_url` を更新する経路も用意する
        - 制約・注意点:
          - 誤登録が最も危険なので、必ず確認ステップ（Yes/No）と、採用URLの正規化・バリデーションを入れる
          - APIキー等のシークレットは絶対に表示・保存しない
        ```

### 2. 検証・テスト（確認方法）

- [ ] 確認1: `/api/instagram-search` がローカルで候補を返す
      - 期待結果: `[{ link, title, snippet, score }]`（少なくとも空配列）で返り、エラー時も統一フォーマット
- [ ] 確認2: 半自動登録ツール（PoC）が東区の対象を1件以上処理できる
      - 期待結果: 採用/スキップが記録される（DRY-RUNならJSON/CSVが生成される）
- [ ] 確認3（任意）: 更新を有効化した場合、Supabase Studio で `facilities.instagram_url` が期待通り更新される
      - 期待結果: 正規化済みプロフィールURLのみが入る（投稿URLやクエリ付きが入らない）

---

## 実施ログ

- スタート: HH:MM
- メモ:
  -

## 結果とふりかえり

- 完了できたタスク:
  - [ ] タスク1（検索API PoC）
  - [ ] タスク2（半自動登録ツール PoC）
- 未完了タスク / 想定外だったこと:
  - [ ] （あれば）
- 学び・次回改善したいこと:
  -

## 次回に持ち越すタスク

- [ ] タスク5の「DB更新の安全装置（バックアップ/ロールバック/差分確認）」を強化して本運用へ
- [ ] タスク6（Runbook整備とデータ品質チェック）を実施
***

## 付録（任意）

- フェーズ9の進捗正本: `docs/05-09-instagram-account-url-coverage.md`


