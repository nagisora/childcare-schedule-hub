# チェックリスト式実装計画書: 2025-12-23

> **セッションとは**: このプロジェクトにおける「セッションの定義」は `docs/dev-sessions/session-definition.md` を参照。
>
> **重要（AI作業時）**: このセッションファイルは `date` コマンドで現在日付（`20251223`）を取得したうえで作成している。

## セッション概要とゴール

### 概要

- 一言サマリ: フェーズ10タスク6（品質チェックSQLの実行と証跡記録）を実施し、異常があればテスト/修正→再実行で収束させる
- 対応フェーズ: フェーズ10
- セッション種別: 検証（品質チェック）/ 不具合修正
- 実行方式: AI自律
- 影響範囲: `apps/scripts/` / `apps/web/app/api/instagram-schedule-search/` / `apps/web/lib/` / `docs/05-10-schedule-url-coverage.md` / `docs/dev-sessions/`
- 日付: 2025-12-23
- 想定所要時間: 60〜180 分

### ゴール

> **チェックの付け方（完了条件）**:
> - 完了条件は **Markdownのチェックリスト**（`- [ ]`）で記述する（セッション開始時点では未チェック）
> - セッションの最後に、満たした完了条件を `- [x]` に更新する（ゴール達成のセルフチェック）
> - ✅（絵文字）のチェックは使わない（`- [ ]` / `- [x]` に統一）

- **ゴール1**: 対象月のデータ投入（必要な場合）と、品質チェックSQLの実行結果を dev-sessions に証跡として残せる
  - 完了条件:
    - [ ] `apps/scripts/fetch-instagram-schedule-post-urls.ts` を最小スコープ（`--limit=1` など）で実行し、エラーなく出力（JSON/Markdown）とバックアップが生成される（必要な場合のみ）
    - [ ] `docs/05-10-schedule-url-coverage.md` の「4. 品質チェック」にあるSQLを1回以上実行し、結果（件数・代表例）を本セッションファイルに記録している
    - [ ] 想定外（URL形式不正/対象月ズレ/未処理残り）があれば、原因を特定し、修正→再実行して結果を更新できる状態にしている
  - 補足:
    - Google CSEの枠/課金を避けるため、スクリプト実行は `--limit` を小さくして段階的に行う
    - シークレット（`ADMIN_API_TOKEN` / `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` / `SUPABASE_SERVICE_ROLE_KEY`）はログや成果物に含めない

### 関連ドキュメント

- 正本: `docs/05-10-schedule-url-coverage.md`（フェーズ10詳細・進捗管理）
- 参照:
  - `docs/phase-artifacts/10-schedule-url-coverage/task-01-spec.md`（対象月/分類/判定フロー）
  - `docs/phase-artifacts/10-schedule-url-coverage/reason-codes.md`（理由コード正本）
  - `docs/06-db-operations.md`（SQL実行・運用の参考）
  - `apps/scripts/fetch-instagram-schedule-post-urls.ts`（一括処理CLI）
  - `apps/scripts/rollback-schedules-from-backup.ts`（ロールバック補助）
  - `docs/dev-sessions/2025/12/20251223-02-phase10-task3-5-search-api-cli-upsert.md`（直近の実装セッション）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - 目的は「品質チェック結果の証跡化」。迷う場合は誤採用を避け、未特定へ倒す方針は維持
  - DB更新はデフォルトDRY-RUN。更新が必要な場合は `--apply --yes` を必須にして最小スコープで行う
  - 品質チェックSQLで異常が出たら、原因を（データ/スクリプト/正規化/クエリ）に切り分け、修正→再実行で収束させる
- 議論概要:
  - タスク3〜5は「実装」は完了。タスク6でSQL実行と証跡を残し、運用に耐える状態にする
- 保留中の論点 / 今回は触らないと決めたこと:
  - 「対象月の根拠」の厳密判定（投稿日推定/OEmbed等）はポストMVPで検討

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & 実行内容（実装・ドキュメント更新）

- [ ] タスク1: （前提）対象月のデータが不足している場合、最小スコープで投入（DRY-RUN→APPLY）してバックアップを作る
  - 完了条件: `apps/scripts/logs/` に JSON/Markdown と `schedules-backup-*.json` が生成される
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/scripts/fetch-instagram-schedule-post-urls.ts
      - apps/scripts/rollback-schedules-from-backup.ts
      - docs/phase-artifacts/10-schedule-url-coverage/task-01-spec.md（対象月の扱い）
    - やりたいこと:
      - まず web サーバーを起動（ローカル）または --api-base-url で呼び先を指定
      - DRY-RUNで実行し、ログ生成と判定（registered/not_found/out_of_scope）が取れることを確認
      - 必要な場合のみ、--apply --yes --limit=1 で最小UPSERTを実行し、バックアップJSONが生成されることを確認
    - 実行コマンド例:
      - web: mise exec -- pnpm --filter web dev
      - dry-run: mise exec -- pnpm --filter scripts tsx fetch-instagram-schedule-post-urls.ts --limit=3 --month=YYYY-MM
      - apply(min): mise exec -- pnpm --filter scripts tsx fetch-instagram-schedule-post-urls.ts --apply --yes --limit=1 --month=YYYY-MM
      - rollback(必要時): mise exec -- pnpm --filter scripts tsx rollback-schedules-from-backup.ts apps/scripts/logs/schedules-backup-<timestamp>.json
    - 制約・注意点:
      - CSE枠/課金回避のため --limit を小さく段階実行する
      - シークレットはログ/成果物に出さない
      - apply は必ず --yes を要求（ガード確認）
    ```

- [ ] タスク2: タスク6の品質チェックSQLを実行し、結果を証跡として記録する
  - 完了条件: `docs/05-10-schedule-url-coverage.md` の「4. 品質チェック」クエリを1回以上実行し、結果（件数・代表例）を本ファイルに記録している
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - docs/05-10-schedule-url-coverage.md（4. 品質チェック）
    - やりたいこと:
      - 対象月を確定する（例: 2025-12-01）
      - SQL 1)〜5) を実行し、結果をこのセッションファイルに貼る（件数・代表例）
      - 未処理（schedules 行が無い対象施設）や、URL形式不正、query/hash残り等があれば一覧を保存する
    - 実行手段:
      - Supabase Studio / Supabase MCP / psql のいずれか
    - 制約・注意点:
      - 機密情報を含む結果（キー等）は貼らない
      - クエリ内の published_month は対象月に必ず置換する
    ```

- [ ] タスク3（任意）: 想定外が出た場合の修正ループ（テスト→修正→再実行→記録）
  - 完了条件: 「想定外」の原因と対応を記録し、再実行で改善した結果を残している（少なくとも1回は再実行まで到達）
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/scripts/fetch-instagram-schedule-post-urls.ts
      - apps/web/lib/instagram-schedule-search.ts
      - apps/web/app/api/instagram-schedule-search/route.ts
      - apps/web/__tests__/instagram-schedule-search-route.test.ts
    - やりたいこと:
      - 不具合を再現し、原因を切り分け（入力・正規化・DB書き込み・SQL条件など）
      - 修正後、webのユニットテストを実行し、必要ならテストを追加/更新する
      - CLI→SQLを再実行し、結果を更新して証跡を残す
    - 実行コマンド例:
      - mise exec -- pnpm --filter web test
      - mise exec -- pnpm --filter scripts tsx fetch-instagram-schedule-post-urls.ts --limit=3 --month=YYYY-MM
    - 制約・注意点:
      - 不具合対応でテストを追加/変更する場合は、テスト観点表ルールに従う
    ```

### 2. 検証・テスト（確認方法）

- [ ] 確認1: web のユニットテストが通る
      - 期待結果: `mise exec -- pnpm --filter web test` が成功する
- [ ] 確認2: CLI の DRY-RUN が動き、`apps/scripts/logs/` に JSON/Markdown が生成される
      - 期待結果: `schedule-url-coverage-*.json` と `schedule-url-review-*.md` が生成される
- [ ] 確認3: 品質チェックSQLを実行し、結果を本セッションファイルに記録する
      - 期待結果: 4. 品質チェックのSQL 1)〜5) の結果（件数・代表例）が残っている

---

## 実施ログ

- スタート: HH:MM
- メモ:
  -

## 結果とふりかえり

> **チェックの付け方**: 完了したタスクは `- [x]` で列挙する。未完了のタスクは `- [ ]` のまま「次回に持ち越すタスク」へ移す。

- 完了できたタスク:
  - [ ] （完了したら記入）
- 未完了タスク / 想定外だったこと:
  - [ ] （未完了があれば記述）
- 学び・次回改善したいこと:
  -

## 次回に持ち越すタスク

> **運用（重要）**:
> - 持ち越しタスクの**正本は常に「最新のセッションファイル 1つ」に集約**する（= 次回は最新だけ見れば良い状態にする）
> - 次のセッションを作ったら、前回セッションの未完了タスクを **新しい（最新）セッション** のこのセクションへコピーする
> - 前回セッション側のこのセクションは、後日 **各行を `- [x] （持ち越し済み → ...）` に更新して凍結**する（ここに追記して増やさない）
> - 後日「漏れていたタスク」に気づいた場合は、**最新セッションにのみ追記**し、行末に `（漏れていたため追加: YYYY-MM-DD）` を付ける

- [ ] タスク6: 品質チェック結果の整理と正本化（`task-06-spec.md` 作成）
  - 今回やらない理由: まずはSQL実行と結果確定を優先する
  - 次回着手条件: 本セッションで品質チェックの結果が揃い、記録フォーマットを確定できる

***

## 付録（任意）

> メモ: フェーズ計画の正本は `docs/05-00-development-phases.md`（索引）と、該当する `docs/05-10-schedule-url-coverage.md`（詳細計画）です。


