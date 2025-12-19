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

- [x] タスク1: タスク4（検索API PoC）を `apps/web/app/api/instagram-search/route.ts` に実装
  - 完了条件: ローカルで `/api/instagram-search?facilityId=...` を叩くと、`[{ link, title, snippet, score }]` 形式の候補配列が返る（エラーは統一フォーマット） ✅
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

- [x] タスク2: タスク5（半自動登録ツール PoC）の設計確定と最小実装（まずは DRY-RUN）
  - 完了条件: `instagram_url IS NULL` の施設を対象に、候補提示→採用/スキップの記録が1件以上できる（最初はCSV/JSON出力でも可） ✅
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

- [x] 確認1: `/api/instagram-search` がローカルで候補を返す
  - 期待結果: `[{ link, title, snippet, score }]`（少なくとも空配列）で返り、エラー時も統一フォーマット ✅
  - 実際の結果: あおぞらわらばぁ～で候補2件（スコア6点・5点）を正常に取得
- [x] 確認2: 半自動登録ツール（PoC）が東区の対象を1件以上処理できる
  - 期待結果: 採用/スキップが記録される（DRY-RUNならJSON/CSVが生成される） ✅
  - 実際の結果: 3施設を処理し、結果JSONを `apps/scripts/logs/` に保存
- [ ] 確認3: 更新を有効化した場合、Supabase MCP で `facilities.instagram_url` が期待通り更新される
  - 期待結果: 正規化済みプロフィールURLのみが入る（投稿URLやクエリ付きが入らない）
  - 確認方法:
    1. CLIツールを `--apply --yes` で実行し、1件以上を採用
    2. Supabase MCP で以下のSQLを実行して確認:
       ```sql
       SELECT id, name, ward_name, instagram_url
       FROM facilities
       WHERE id IN ('<採用した施設ID>', ...)
       ORDER BY name;
       ```
    3. 確認項目:
       - `instagram_url` が `https://www.instagram.com/<username>/` 形式になっているか
       - 投稿URL（`/p/`）やクエリパラメータ（`?igsh=`）が含まれていないか
       - 正規化が正しく行われているか
  - 補足: 実際の更新は次回セッションで実施予定（今回は確認方法を明確化）

---

## 実施ログ

- スタート: 2025-12-13
- メモ:
  - **タスク1（検索API PoC）実装完了**:
    - `apps/web/lib/instagram-search.ts` を新規作成（検索クエリ生成・URL正規化・スコアリング）
    - `apps/web/app/api/instagram-search/route.ts` を新規作成（管理トークン必須、CSE呼び出し、正規化レスポンス）
    - 環境変数 `ADMIN_API_TOKEN` を `env.local.example` と `docs/04-development.md` に追加
    - ユニットテスト `apps/web/__tests__/instagram-search.test.ts` を追加
  - **タスク2（半自動登録ツール PoC）実装完了**:
    - `apps/scripts/instagram-semi-auto-registration.ts` を新規作成（DRY-RUNデフォルト、任意apply、バックアップ/二重確認）
    - `apps/scripts/package.json` に実行スクリプトを追加
    - `docs/04-development.md` にCLIツールの使い方を追記（9.5.3節）
  - **動作確認**: 完了
    - API動作確認: 成功
      - `/api/instagram-search?facilityId=63a69b16-11f3-41ad-9485-7e5546e35d5b` で候補2件を取得
      - スコアリング正常（6点・5点）、正規化正常（プロフィールURL形式）
      - 管理トークン認証正常
    - CLIツール動作確認: 成功
      - DRY-RUNモードで東区3施設を処理
      - あおぞらわらばぁ～: 候補2件検出
      - いずみ・やだっこひろば: 候補なし
      - 結果JSONを `apps/scripts/logs/` に保存
    - 検出された問題と修正:
      - 非対話環境でのreadlineエラーを検出・修正（エラーハンドリング改善）
      - インポートパス修正（`@/lib/` → `../../../lib/`）

## 結果とふりかえり

- 完了できたタスク:
  - [x] タスク1（検索API PoC）: 実装完了。`/api/instagram-search` Route Handler と共通ロジック（`lib/instagram-search.ts`）を追加。管理トークン認証、CSE呼び出し、正規化・スコアリングを実装。
  - [x] タスク2（半自動登録ツール PoC）: 実装完了。CLIツール（`apps/scripts/instagram-semi-auto-registration.ts`）を追加。DRY-RUNデフォルト、バックアップ機能、二重確認付き更新機能を実装。
- 未完了タスク / 想定外だったこと:
  - [x] 動作確認完了: APIとCLIツールの基本的な動作を確認。非対話環境でのreadlineエラーを検出・修正。
- 学び・次回改善したいこと:
  - CLIツールで `/api/instagram-search` を呼び出す際、開発サーバーが起動している必要がある点を明記した（`docs/04-development.md` に追記済み）
  - テスト観点表を追加し、URL正規化・スコアリング閾値・クエリ生成のテストを実装した
  - 非対話環境でのreadlineエラーを検出し、エラーハンドリングを改善（最初の候補を自動採用候補として記録）
  - 動作確認結果: あおぞらわらばぁ～で候補2件（スコア6点・5点）を検出。いずみ・やだっこひろばは候補なし。
  - **検索精度の課題（短い施設名の誤検出）**:
    - 例: 施設名が短い（`いずみ`）ケースでは、スコア方式だけだと無関係なアカウントが上位に来やすい
    - ユーザー確認: Google検索で `site:instagram.com いずみ 子育て 名古屋市 東区` を実行すると、上位（1位〜3位）に正しい候補が出る
      - 正しい候補（ユーザー確認）: `https://www.instagram.com/chunichikai.official/`
    - 学び: 「適切なクエリを作ってGoogleのランキング（上位1〜3件）を信頼する」アプローチが、短い施設名では有効そう
  - **コスト制約（個人開発・無料枠優先）**:
    - Google CSE はクエリ回数がコストに直結するため、できるだけ少ないクエリで精度を担保したい
    - 方針案: クエリは少数（例: 2〜3本）に限定し、高信頼時は早期終了する（＝クエリ数を抑える）

## 次回に持ち越すタスク

> 運用: 持ち越しタスクの正本は最新セッションに集約する。このセクションは当日のスナップショットとして残し、後日ここに追記して増やさない。

- [x] 検索戦略の切り替え機構を追加（スコア方式を残しつつ、ランキング方式を追加） - 2025-12-14（[dev-session](./20251214-01-phase9-instagram-search-strategy-switch.md)）
- [x] タスク5の「DB更新の安全装置（バックアップ/ロールバック/差分確認）」を強化して本運用へ（持ち越し済み → [dev-session](./20251214-01-phase9-instagram-search-strategy-switch.md)）
- [x] タスク6（Runbook整備とデータ品質チェック）を実施（持ち越し済み → [dev-session](./20251214-01-phase9-instagram-search-strategy-switch.md)）
- [x] 検索精度の実測を 10〜20件に拡大し、成功/失敗パターンを記録（短い施設名ケースを含める）（持ち越し済み → [dev-session](./20251214-01-phase9-instagram-search-strategy-switch.md)）
- [x] 対象区（東区）を「処理済み」にする（採用/未特定（理由付き）を確定し、必要なら `--apply` でDB反映）（持ち越し済み → [dev-session](./20251214-01-phase9-instagram-search-strategy-switch.md)）
- [x] 再検索抑制のためのキャッシュ（facilityId+query+results など）の設計・実装（持ち越し済み → [dev-session](./20251214-01-phase9-instagram-search-strategy-switch.md)）

***

## 付録（任意）

- フェーズ9の進捗正本: `docs/05-09-instagram-account-url-coverage.md`

### 開発者からの指摘（未編集全文）

```
現行のスコア算出のやり方の精度が悪くて微妙な気がします。

私がGoogle検索で「site:instagram.com いずみ 子育て 名古屋市 東区」と検索すると添付画像のように検索され、一番上のリンク（ https://www.instagram.com/chunichikai.official/  ）で正しいのです。

つまり、適切なキーワードでGoogke検索して一番上、もしくは3つ目くらいまでで一番正しいものを選ぶのが良いと思うのです。

今のスコア方式も残し、私のやり方も実装し切り替えれるようにするのはどう？

ただ、今日はもう時間がないので、私のこの意見や次への持ち越しなど必要事項を @20251213-02-phase9-instagram-search-api-semi-auto-registration.md に記録して終わりにしましょう。
```
