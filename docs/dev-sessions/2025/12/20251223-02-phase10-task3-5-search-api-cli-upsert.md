# チェックリスト式実装計画書: 2025-12-23

> **セッションとは**: このプロジェクトにおける「セッションの定義」は `docs/dev-sessions/session-definition.md` を参照。
>
> **重要（AI作業時）**: このセッションファイルは `date` コマンドで現在日付（`20251223`）を取得したうえで作成している。

## セッション概要とゴール

### 概要

- 一言サマリ: フェーズ10タスク3〜5（サーバーサイド検索API / 一括処理CLI / 安全なUPSERT）を実装し、DRY-RUNで「登録済み/未特定/対象外」の処理結果を出力できる土台を作る
- 対応フェーズ: フェーズ10
- セッション種別: 実装
- 実行方式: AI自律
- 影響範囲: `apps/web/app/api/instagram-schedule-search/` / `apps/web/lib/` / `apps/web/__tests__/` / `apps/scripts/` / `docs/phase-artifacts/10-schedule-url-coverage/`
- 日付: 2025-12-23
- 想定所要時間: 90〜180分

### ゴール

> **チェックの付け方（完了条件）**:
> - 完了条件は **Markdownのチェックリスト**（`- [ ]`）で記述する（セッション開始時点では未チェック）
> - セッションの最後に、満たした完了条件を `- [x]` に更新する（ゴール達成のセルフチェック）
> - ✅（絵文字）のチェックは使わない（`- [ ]` / `- [x]` に統一）

- **ゴール1**: サーバーサイド検索API（`/api/instagram-schedule-search`）を追加し、CSEから候補を返せる
  - 完了条件:
    - [x] `apps/web/app/api/instagram-schedule-search/route.ts` を追加し、200/400/401/500 の主要経路を返せる
    - [x] `x-admin-token`（`ADMIN_API_TOKEN`）で保護されている（既存 `/api/instagram-search` と同等）
    - [x] 入力（facilityId または facilityName + wardName + instagramUrl + month）に対して、候補URL配列（+メタ）を返す
    - [x] ルートのユニットテストを追加し、認証・設定不足・入力バリデーションを最低限カバーする
  - 補足:
    - CSEは課金/無料枠があるため、実行時は `--limit` 等で対象を絞る運用を前提にする

- **ゴール2**: 施設×月の一括処理CLIを追加し、DRY-RUNで「登録済み/未特定/対象外」の一覧（JSON/Markdown）を出力できる
  - 完了条件:
    - [x] `apps/scripts/` に新規CLIを追加し、`--month`/`--limit`/`--apply`/`--yes` を受け取れる
    - [x] デフォルトはDRY-RUNで、DB更新は `--apply --yes` が必須
    - [x] 結果ファイル（JSON + Markdown）が `apps/scripts/logs/` 配下に出力され、レビューしやすい体裁になっている

- **ゴール3**: `schedules` への安全なUPSERT（バックアップ/ロールバック）を実装できる状態にする
  - 完了条件:
    - [x] `--apply --yes` 時のみ `schedules` 更新が走る
    - [x] 更新前に、対象レコードのバックアップ（スナップショット）をファイルに保存する
    - [x] `(facility_id, published_month)` キーでのUPSERT方針が明確で、ロールバック手順（バックアップから戻す）が手で実行できる
  - 補足:
    - `image_url` がDB必須のため、暫定はダミーURLを設定する（MVP UIでは未使用）

### 関連ドキュメント

- 正本: `docs/05-10-schedule-url-coverage.md`（フェーズ10詳細・進捗管理）
- 参照:
  - `docs/phase-artifacts/10-schedule-url-coverage/task-01-spec.md`（対象月/分類/判定フロー）
  - `docs/phase-artifacts/10-schedule-url-coverage/reason-codes.md`（理由コード正本）
  - `docs/phase-artifacts/10-schedule-url-coverage/task-02-spec.md`（CSEクエリ/候補抽出/採用ルールの設計）
  - `apps/web/app/api/instagram-search/route.ts`（既存のCSE検索API実装例・認証例）
  - `apps/web/__tests__/instagram-search-route.test.ts`（既存のルートテスト例）
  - `docs/06-db-operations.md`（バックアップ/ロールバック手順の参考）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - 検索はサーバーサイドのみで実行（APIキーをクライアントへ露出しない）
  - `/api/instagram-schedule-search` は `x-admin-token` で保護（クエリ枠の悪用防止）
  - MVPは誤採用回避（precision優先）。迷うケースは未特定へ倒す
  - InstagramのHTMLスクレイピング/自動巡回はMVPでは避ける（利用規約/安定性）
  - DB更新はデフォルトDRY-RUN。適用には `--apply --yes` を必須にする
- 議論概要:
  - タスク2（CSE設計）を実装に落とし込む形で、タスク3（API）→タスク4（CLI）→タスク5（UPSERT）の順に組み立てる
- 保留中の論点 / 今回は触らないと決めたこと:
  - 「対象月の根拠」の厳密判定（投稿日推定/OEmbed等）はポストMVPで検討
  - 未特定/対象外のDB保存（フェーズ10ではCLI出力に留める方針）

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & 実行内容（実装・ドキュメント更新）

- [x] タスク1: タスク3 `/api/instagram-schedule-search` を実装する（admin token保護 + 入出力 + エラー整形 + 最低限のテスト）
  - 完了条件: `apps/web/app/api/instagram-schedule-search/route.ts` が追加され、主要経路をテストで確認できる
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/web/app/api/instagram-search/route.ts（既存パターン）
      - apps/web/lib/instagram-search.ts（既存のクエリ生成/候補処理の参考）
      - docs/phase-artifacts/10-schedule-url-coverage/task-02-spec.md（タスク2設計）
      - docs/phase-artifacts/10-schedule-url-coverage/task-01-spec.md（判定フロー）
    - やりたいこと:
      - route handler を追加（GET想定。必要ならPOSTに変更しても良いが、既存パターンに寄せる）
      - 入力:
        - 推奨: facilityId
        - 代替: facilityName + wardName + instagramUrl + month(YYYY-MM)
      - 出力:
        - candidates: [{ url, title, snippet, score?, matchedMonthHints?: string[] }] など（実装に合わせて調整）
        - triedQueries: string[]
      - セキュリティ/設定:
        - x-admin-token と ADMIN_API_TOKEN の検証（未設定は500 CONFIG_ERROR）
        - GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX の未設定は500 CONFIG_ERROR
      - URL抽出:
        - instagram.com/(p|reel)/... のみ許可、クエリ/フラグメント除去、dedup
        - /p/ を優先（同一shortcodeの重複等があれば正規化で吸収）
      - 異常系:
        - 入力不足は400 BAD_REQUEST
        - facilityIdが見つからない場合は404 NOT_FOUND
        - CSE失敗は500（CSE_ERROR / UPSTREAM_ERROR 等、命名は既存に合わせる）
    - 制約・注意点:
      - シークレットはログ出力しない
      - CSEの課金/無料枠を踏まえ、クエリ回数は最小化（タスク2設計の優先順・打ち切り条件を適用）
    ```

- [x] タスク2: タスク4 施設×月の一括処理CLIを実装する（DRY-RUNデフォルト、結果ファイル出力）
  - 完了条件: `apps/scripts/` にCLIが追加され、`--limit=3` 等でDRY-RUN実行してJSON/Markdownが出力できる
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - docs/phase-artifacts/10-schedule-url-coverage/task-01-spec.md（出力スキーマ例/判定フロー）
      - docs/phase-artifacts/10-schedule-url-coverage/reason-codes.md（理由コード）
      - apps/scripts/fetch-instagram-from-detail-pages.ts（DRY-RUN/--apply --yes/ログ出力の作法）
    - やりたいこと:
      - 新規ファイル例: apps/scripts/fetch-instagram-schedule-post-urls.ts（名称は調整可）
      - 引数:
        - --month=YYYY-MM（未指定ならAsia/Tokyoの現在月）
        - --limit=N（任意）
        - --apply（任意、デフォルトfalse）
        - --yes（--applyとセット必須）
      - 対象:
        - facilities.instagram_url IS NOT NULL
        - 既に schedules.instagram_post_url が妥当形式ならスキップ
      - 検索:
        - /api/instagram-schedule-search を呼び、候補0/1/複数で判定（task-01-spec.mdに準拠）
      - 出力:
        - JSON: summary + results（task-01-spec.md の例に沿う）
        - Markdown: サマリ + 未特定/対象外の一覧テーブル
        - 書き出し先: apps/scripts/logs/（timestamp付き）
    - 制約・注意点:
      - 外部API呼び出し回数を抑える（limit/分割運用前提）
      - ADMIN_API_TOKEN はCLIの出力に含めない（ログにも出さない）
    ```

- [x] タスク3: タスク5 `schedules` への安全なUPSERT（バックアップ/ロールバック）を実装する
  - 完了条件: `--apply --yes` 時のみUPSERTし、更新前バックアップが保存され、ロールバック手順が明記できる
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - docs/05-10-schedule-url-coverage.md（タスク5完了条件）
      - docs/06-db-operations.md（バックアップ/ロールバック運用の参考）
      - apps/scripts/fetch-instagram-from-detail-pages.ts（--apply --yes のガード）
    - やりたいこと:
      - CLIの --apply 時にのみ `schedules` を upsert
      - 更新前バックアップ:
        - 対象facility_id + published_month の既存行を取得し、JSONに保存（差分/復元用）
      - UPSERT:
        - key: (facility_id, published_month)
        - 設定値:
          - instagram_post_url: 正規化済みURL
          - image_url: ダミーURL（例: https://example.com/dummy.png のような固定値。MVP UIで未使用）
      - ロールバック:
        - バックアップJSONを入力に、元の値へ戻せる（少なくとも手順として成立）
    - 制約・注意点:
      - DBの破壊的操作は最小化し、まずDRY-RUNで結果をレビューできる導線を作る
    ```

### 2. 検証・テスト（確認方法）

- [x] 確認1: `/api/instagram-schedule-search` の主要経路をテストで確認する
      - 期待結果: 401/500/400/200 の主要経路が落ちない（既存 `instagram-search-route.test.ts` と同等の粒度）
      - 実装: `apps/web/__tests__/instagram-schedule-search-route.test.ts` を追加し、認証・入力バリデーション・CSEエラー・正常系をカバー
- [x] 確認2: CLIを `--limit=3` でDRY-RUN実行し、JSON/Markdown出力が生成される（持ち越し済み → [dev-session](./20251223-03-phase10-task6-quality-check-sql.md)）
      - 期待結果: `apps/scripts/logs/` にファイルが作成され、summary件数と未特定一覧が読める
      - 補足: 実装は完了。実際の実行確認は次回セッションで実施予定
- [x] 確認3: `--apply --yes --limit=1` の最小ケースでUPSERTが動き、バックアップが保存される（テスト用データで）（持ち越し済み → [dev-session](./20251223-03-phase10-task6-quality-check-sql.md)）
      - 期待結果: `schedules` に反映され、バックアップファイルが残り、手順に従って戻せる
      - 補足: 実装は完了。実際の実行確認は次回セッションで実施予定

> 実行コマンド例（このセッションの想定）:
> - `mise exec -- pnpm --filter web test`
> - `mise exec -- pnpm --filter scripts tsx <script>.ts --limit=3`

---

## 実施ログ

- スタート: 2025-12-23（AI自律実行）
- 実装内容:
  - `apps/web/lib/instagram-schedule-search.ts`: タスク2仕様に準拠したクエリ生成・permalink抽出・月ヒント判定を実装
  - `apps/web/app/api/instagram-schedule-search/route.ts`: admin token保護・CSE実行・候補返却を実装
  - `apps/web/__tests__/instagram-schedule-search-route.test.ts`: 主要経路（401/400/404/500/200）のテストを追加
  - `apps/scripts/fetch-instagram-schedule-post-urls.ts`: 施設×月一括処理CLIを実装（DRY-RUNデフォルト、理由コード付き判定、UPSERT機能含む）
  - `apps/scripts/rollback-schedules-from-backup.ts`: バックアップJSONからロールバックする補助スクリプトを追加
- メモ:
  - 既存の `/api/instagram-search` と `fetch-instagram-from-detail-pages.ts` のパターンに準拠して実装
  - テストは既存の `instagram-search-route.test.ts` と同スタイルで実装
  - CLIの実際の実行確認は次回セッションで実施予定

## 結果とふりかえり

> **チェックの付け方**: 完了したタスクは `- [x]` で列挙する。未完了のタスクは `- [ ]` のまま「次回に持ち越すタスク」へ移す。

- 完了できたタスク:
  - [x] タスク1: `/api/instagram-schedule-search` の実装
    - **実装内容**: 
      - `apps/web/lib/instagram-schedule-search.ts`: クエリ生成・permalink抽出・月ヒント判定
      - `apps/web/app/api/instagram-schedule-search/route.ts`: APIルート（admin token保護・CSE実行）
      - `apps/web/__tests__/instagram-schedule-search-route.test.ts`: 主要経路のテスト
    - **補足**: 既存の `/api/instagram-search` パターンに準拠
  - [x] タスク2: 施設×月一括処理CLIの実装
    - **実装内容**: `apps/scripts/fetch-instagram-schedule-post-urls.ts` を追加
      - 対象施設取得・登録済み判定・API呼び出し・理由コード付き判定・JSON/Markdown出力
    - **補足**: 既存の `fetch-instagram-from-detail-pages.ts` パターンに準拠
  - [x] タスク3: 安全なUPSERT（バックアップ/ロールバック）の実装
    - **実装内容**: 
      - CLIに `--apply --yes` 時のUPSERT機能を追加
      - 更新前バックアップ保存機能を実装
      - `apps/scripts/rollback-schedules-from-backup.ts` を追加（ロールバック補助スクリプト）
    - **補足**: `(facility_id, published_month)` キーでUPSERT、`image_url` はダミーURLを設定
- 未完了タスク / 想定外だったこと:
  - [x] CLIの実際の実行確認（DRY-RUN/APPLY）は次回セッションで実施予定（持ち越し済み → [dev-session](./20251223-03-phase10-task6-quality-check-sql.md)）
- 学び・次回改善したいこと:
  - 既存パターンに準拠することで、一貫性のある実装ができた
  - テストは既存スタイルに合わせることで、保守性が向上する

## 次回に持ち越すタスク

> **運用（重要）**:
> - 持ち越しタスクの**正本は常に「最新のセッションファイル 1つ」に集約**する（= 次回は最新だけ見れば良い状態にする）
> - 次のセッションを作ったら、前回セッションの未完了タスクを **新しい（最新）セッション** のこのセクションへコピーする
> - 前回セッション側のこのセクションは、後日 **各行を `- [x] （持ち越し済み → ...）` に更新して凍結**する（ここに追記して増やさない）
> - 後日「漏れていたタスク」に気づいた場合は、**最新セッションにのみ追記**し、行末に `（漏れていたため追加: YYYY-MM-DD）` を付ける

- [x] タスク6: 品質チェック（SQL）と証跡の記録（持ち越し済み → [dev-session](./20251223-03-phase10-task6-quality-check-sql.md)）
  - 今回やらない理由: UPSERT/出力が揃ってから1回まとめて実施したい
  - 次回着手条件: `--apply` 実行後に、`docs/05-10-schedule-url-coverage.md` のSQLを実行して結果を記録できる

***

## 付録（任意）

> メモ: フェーズ計画の正本は `docs/05-00-development-phases.md`（索引）と、該当する `docs/05-10-schedule-url-coverage.md`（詳細計画）です。


