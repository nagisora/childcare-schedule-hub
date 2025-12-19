# フェーズ10詳細: スケジュールURLの全面カバー

<a id="progress"></a>
## 0. 進捗チェックリスト（正本）

このドキュメントはフェーズ10の**進捗管理の正本**とする。

- チェックの付け方:
  - 未完了: `- [ ]`
  - 完了: `- [x]`（可能なら `YYYY-MM-DD` と証跡リンク（dev-sessions等）を併記）

### フェーズ10: 全体の完了条件（MVP）

- [ ] 対象施設（`facilities.instagram_url IS NOT NULL`）について、対象月（原則「現在月」）の `schedules` が「登録済み / 未特定確定 / 対象外」のいずれかに分類され、**処理済み**になっている
  - 登録済みは `schedules` に反映（`instagram_post_url` を設定）
  - 未特定確定/対象外は dev-sessions に「理由コード付き一覧（JSON/CSV/Markdown）」として証跡が残っている
- [ ] **自動取得をCLIで実装**し、AIがCLIを自動実行してカバーできた範囲をもってMVPとして完了できる（手動でしか取れないものをMVP完了の必須条件にしない）
- [ ] データ品質チェック（`published_month` の整合、重複、URL形式）が1回以上実施され、dev-sessionsに記録されている

### 実装タスク（セッション粒度の進捗）

- [ ] [タスク1: 取得仕様の確定（対象月・判定・理由コード）](#task-1)
- [ ] [タスク2: 投稿URL候補検索（Google CSE）の設計](#task-2)
- [ ] [タスク3: サーバーサイド検索API（`/api/instagram-schedule-search`）の実装](#task-3)
- [ ] [タスク4: 施設×月の一括処理CLI（カバー/未特定一覧化）](#task-4)
- [ ] [タスク5: `schedules` への安全なUPSERT（バックアップ/ロールバック）](#task-5)
- [ ] [タスク6: 品質チェック（SQL）と証跡の記録](#task-6)

---

## 1. 概要

- **対応フェーズ**: フェーズ10
- **目的**: 各施設が Instagram に投稿している**月間スケジュール（当月）を自動で特定**し、MVPで表示できる参照情報（基本は Instagram 投稿URL）として `schedules` に反映できる状態にする
- **スコープ（MVP）**:
  - 対象施設: `facilities.instagram_url IS NOT NULL`
  - 対象月: 原則「現在月」（`published_month` は対象月の1日で統一）
  - 取得対象: Instagram投稿の permalink（例: `https://www.instagram.com/p/.../`、必要なら `.../reel/.../` も候補に含める）
  - 出力: `schedules.instagram_post_url` の登録、または「未特定確定/対象外（理由コード付き）」の一覧化
- **非スコープ（MVP）**:
  - `facilities.instagram_url IS NULL` の施設のカバー（将来: `website_url` / 自治体サイト / PDF / Googleカレンダー等で回収）
  - InstagramのHTMLスクレイピング前提の自動巡回（利用規約/安定性の観点で避ける）
  - 運用Runbookの「運用できる粒度」への整備（MVP後回し可）
- **完了条件（MVP）**:
  - 「0. 進捗チェックリスト（正本）」に集約
- **関連ドキュメント**:
  - `docs/05-00-development-phases.md`（フェーズ10セクション）
  - `docs/05-09-instagram-account-url-coverage.md`（フェーズ9のCSE/CLI設計の参考）
  - `docs/02-design.md`（`schedules` テーブル定義）
  - `docs/03-api.md`（`ScheduleSummary` / Instagram embed方針）
  - `docs/04-development.md`（9.6節: 既存の手動Runbook、`image_url` ダミー可の方針）

---

## 2. 前提・制約

- **規約・利用条件**:
  - Instagramの利用規約に抵触し得るスクレイピング/自動巡回は避ける（MVPでは「検索結果から候補URLを列挙→採用/未特定の判断」を基本）
  - Google Custom Search API / Programmable Search Engine（CSE）の利用規約とレート制限に従う
- **コスト・レート制限**:
  - Google Custom Search API は無料枠（例: 1日100クエリ）を超えると課金が発生し得る
  - 対象件数が多い場合、対象区/対象数を絞る、複数日に分割する、再検索を抑制する等で回避する
- **データ品質要件**:
  - `published_month` は対象月の1日で統一（例: `2025-02-01`）
  - `schedules.instagram_post_url` は `instagram.com` の投稿URL（permalink）として妥当な形式のみを許可する
  - 共有リンクのクエリパラメータ/フラグメントは除去（`?` / `#` を残さない）
  - `(facility_id, published_month)` は1件に収束（ユニーク制約あり。登録時はUPSERT方針で更新）
- **技術的制約**:
  - 検索APIはサーバーサイドのみで実行（APIキーをクライアントへ露出しない）
  - 公開悪用でクエリ枠を消費されないよう、内部APIは `ADMIN_API_TOKEN` 等で保護する

---

## 3. 実装計画

> このセクションは、フェーズ10全体の実装計画をまとめたものです。  
> 各タスクの詳細な完了条件・検証方法・dev-sessions粒度については、個別のセッションで具体化していきます。

<a id="task-1"></a>
### タスク1: 取得仕様の確定（対象月・判定・理由コード）

- **完了条件**:
  - [ ] 対象施設/対象月の定義がドキュメント化され、CLIの入力仕様（`--month` など）に落ちる
  - [ ] 施設×月が「登録済み / 未特定確定 / 対象外」に分類される判定基準が決まっている
  - [ ] 理由コードが固定され、出力（JSON/Markdown）に必ず含まれる
- **検証方法**:
  - [ ] `docs/05-00-development-phases.md` のフェーズ10節と本ファイルの整合を目視確認
  - [ ] 理由コードが重複/曖昧になっていないことを目視確認（フェーズ9の `reason` と同様に機械可読を優先）
- **dev-sessions粒度**:
  - 1セッション（20〜40分）
- **更新先ドキュメント**:
  - `docs/05-10-schedule-url-coverage.md`（本ファイル）

<a id="task-2"></a>
### タスク2: 投稿URL候補検索（Google CSE）の設計

- **完了条件**:
  - [ ] 入力（施設名/区名/instagram username/対象月）から、CSEクエリを生成できる
  - [ ] 候補抽出のルール（`/p/` 優先、`/reel/` の扱い、除外URL等）が決まっている
  - [ ] 採用/未特定のヒューリスティクス（単一候補のみ自動採用、複数候補は未特定等）が決まっている
- **検証方法**:
  - [ ] 2〜3施設で、設計したクエリをGoogle検索で手動試行し、候補が取れそうか確認
  - [ ] 誤検出しやすいケース（施設名が短い、一般名詞、同名施設）でも「複数候補→未特定」に倒れることを確認
- **dev-sessions粒度**:
  - 1〜2セッション（30〜60分）
- **更新先ドキュメント**:
  - `docs/05-10-schedule-url-coverage.md`
  - （必要なら）`docs/instagram-integration/03-design-decisions.md`（将来の正規化ロジック共有）

<a id="task-3"></a>
### タスク3: サーバーサイド検索API（`/api/instagram-schedule-search`）の実装

- **完了条件**:
  - [ ] `apps/web/app/api/instagram-schedule-search/route.ts` を追加し、CSEから候補（投稿URL候補+メタ）を返せる
  - [ ] `x-admin-token`（`ADMIN_API_TOKEN`）で保護されている
  - [ ] 入力: `facilityId`（推奨）または `facilityName` + `wardName` + `instagramUrl` + `month`
  - [ ] 出力: 例 `[{ url, title, snippet, score, matchedMonthHints: [...] }]`（名称は実装に合わせて調整）
  - [ ] 例外/400/401/500のエラーフォーマットが統一されている
- **検証方法**:
  - [ ] `mise exec -- pnpm --filter web dev` でローカル起動
  - [ ] `curl` 等でAPIを叩き、401/200/500の主要経路を確認（シークレットはログ出力しない）
- **dev-sessions粒度**:
  - 1〜3セッション（60〜180分）
- **更新先ドキュメント**:
  - `docs/03-api.md`（必要なら内部APIとして追記）
  - `docs/dev-sessions/`（実装ログ・検証結果）

<a id="task-4"></a>
### タスク4: 施設×月の一括処理CLI（カバー/未特定一覧化）

- **完了条件**:
  - [ ] `facilities.instagram_url IS NOT NULL` を対象に、施設を順次処理できる
  - [ ] 施設ごとに検索APIを呼び、候補提示→（自動採用 or 未特定確定/対象外）を判断して記録できる
  - [ ] 非対話環境でも安全に動く（デフォルトはDRY-RUN、適用には `--apply --yes` 必須）
  - [ ] 出力ファイル（JSON + Markdown）が生成され、未特定/対象外の一覧がレビューしやすい
- **検証方法**:
  - [ ] まずは対象を `--limit=3` 等で絞ってDRY-RUN実行し、出力ファイルの体裁を確認
  - [ ] 既に登録済みの施設×月がスキップされることを確認
- **dev-sessions粒度**:
  - 2〜4セッション（90〜240分）
- **更新先ドキュメント**:
  - `docs/dev-sessions/`（実行ログ・出力の証跡）
  - （MVP後回し可）`docs/04-development.md`（CLI運用Runbook）

<a id="task-5"></a>
### タスク5: `schedules` への安全なUPSERT（バックアップ/ロールバック）

- **完了条件**:
  - [ ] `--apply` 時のみDB更新が走る（DRY-RUNがデフォルト）
  - [ ] 更新前にバックアップ（対象レコードのスナップショット）をファイルに保存する
  - [ ] UPSERT方針が明確（`facility_id` + `published_month` をキーに更新/作成）
  - [ ] `image_url` はDB必須のため、暫定はダミーURLを設定できる（MVP UIでは未使用）
- **検証方法**:
  - [ ] テスト用に1施設×1月で `--apply --yes` を実行し、DBに反映されることを確認
  - [ ] ロールバック手順（バックアップから戻す）が手で実行できることを確認
- **dev-sessions粒度**:
  - 1〜2セッション（60〜120分）
- **更新先ドキュメント**:
  - `docs/dev-sessions/`（バックアップ/ロールバック証跡）

<a id="task-6"></a>
### タスク6: 品質チェック（SQL）と証跡の記録

- **完了条件**:
  - [ ] 本ファイル「4. 品質チェック」にあるSQLを1回以上実行し、結果を dev-sessions に記録
  - [ ] 想定外（URL形式不正/対象月ズレ/未処理残り）があれば修正して再実行できる
- **検証方法**:
  - [ ] Supabase Studio / MCP / psql などでSQLを実行し、結果（件数、代表例）を記録
- **dev-sessions粒度**:
  - 1セッション（30〜60分）
- **更新先ドキュメント**:
  - `docs/dev-sessions/`

### フェーズ完了時のチェックリスト

- [ ] **フェーズの完了チェック**: 「0. 進捗チェックリスト（正本）」の完了条件がすべて満たされている
- [ ] **（任意）コードのリファクタリング**:
  - [ ] `/remove-ai-code-slop`
  - [ ] `/refactor-plan`
- [ ] **プルリクエストの作成**（必要な場合）
- [ ] **Vercelのエラー確認**（デプロイを伴う場合）

---

## 4. 品質チェック

- **データ品質チェック（チェックリスト）**:
  - [ ] `published_month` が「月の1日」で統一されている
  - [ ] `(facility_id, published_month)` の重複がない
  - [ ] `instagram_post_url` の形式が妥当（`instagram.com/(p|reel)/...`、クエリ/フラグメントなし）
  - [ ] 対象施設×対象月の「未処理」が残っていない（登録済み or 未特定/対象外の一覧に載っている）
- **検証方法**:
  - Supabase Studio で `schedules` を確認
  - SQLで集計/検出し、結果を dev-sessions に記録
- **検証クエリ例**:
  ```sql
  -- 1) 対象月（例: 2025-02-01）で、対象施設のうち「登録済み（= instagram_post_urlあり）」の件数
  SELECT
    COUNT(*) AS registered_count
  FROM schedules s
  JOIN facilities f ON f.id = s.facility_id
  WHERE f.instagram_url IS NOT NULL
    AND s.published_month = '2025-02-01'
    AND s.instagram_post_url IS NOT NULL;

  -- 2) 対象月で、対象施設のうち「schedules行が無い」施設（= まだ登録済みにできていない）
  SELECT f.id, f.name, f.ward_name, f.instagram_url
  FROM facilities f
  LEFT JOIN schedules s
    ON s.facility_id = f.id
   AND s.published_month = '2025-02-01'
  WHERE f.instagram_url IS NOT NULL
    AND s.id IS NULL
  ORDER BY f.ward_name, f.name;

  -- 3) published_month が月の1日でないレコードの検出
  SELECT id, facility_id, published_month
  FROM schedules
  WHERE EXTRACT(DAY FROM published_month) <> 1;

  -- 4) instagram_post_url のドメイン/形式チェック（投稿URL or リールURLのみ許可）
  SELECT id, facility_id, instagram_post_url
  FROM schedules
  WHERE instagram_post_url IS NOT NULL
    AND instagram_post_url !~* '^https?://(www\\.)?instagram\\.com/(p|reel)/';

  -- 5) 共有リンクのクエリ/フラグメントが残っていないか
  SELECT id, facility_id, instagram_post_url
  FROM schedules
  WHERE instagram_post_url IS NOT NULL
    AND (instagram_post_url LIKE '%?%' OR instagram_post_url LIKE '%#%');
  ```
- **チェック実施タイミング**:
  - データ投入後（`--apply` 実行後）
  - フェーズ完了前（必須）

---

## 5. リスク・撤退条件・ロールバック

- **リスク**:
  - Google CSE の無料枠/レート制限に達する（処理が止まる/課金が発生する）
  - 検索精度が不十分で誤採用が起きる（特に施設名が短い/同名が多い）
  - Instagram側の仕様/検索インデックス変化で結果が揺れる
- **撤退条件**:
  - CSEで十分な割合が取れず、MVP期限内に手動対応が必要な割合が高すぎる場合は、MVPでは「未特定確定」として一覧化し、ポストMVPで回収する
- **ロールバック手順**:
  - `--apply` 実行前に保存したバックアップファイルから、更新した `schedules` を元の値へ戻す（対象は facility_id + published_month で特定）
  - 誤登録が少数なら、該当行のみ `instagram_post_url` をNULLに戻す or 行を削除（運用ポリシーに従う）
- **フォールバック手順**:
  - 標準フロー（CSE→候補→自動採用）が失敗する場合は、未特定理由コード付きで一覧化し「処理済み」に倒す（MVPでは無理に手動で埋めない）

---

## 6. 将来の拡張・メモ

- **拡張候補**:
  - 施設ごとの「投稿パターン」（固定投稿/ハイライト/外部リンク等）を学習してクエリ戦略を最適化
  - oEmbed導入（ポストMVP）により、投稿の可用性チェック/埋め込みキャッシュ/失敗監視を強化
  - Instagram以外の経路（公式サイト、自治体サイト、PDF）も統合した回収フロー
- **運用上の注意**:
  - シークレット（CSE APIキー、ADMINトークン）はログ/出力ファイルに含めない
  - 「自動採用」は単一候補に限定し、迷うケースは必ず未特定に倒す
- **関連する将来フェーズ**:
  - フェーズ11〜13（リリース準備/本番テスト/告知）へ向けて、データ品質の維持と「未特定一覧」の扱いを確立する

