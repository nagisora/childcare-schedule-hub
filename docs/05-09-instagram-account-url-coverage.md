# フェーズ9詳細: InstagramアカウントURLの全面カバー

<a id="progress"></a>
## 0. 進捗チェックリスト（正本）

このドキュメントはフェーズ9の**進捗管理の正本**とする。

- チェックの付け方:
  - 未完了: `- [ ]`
  - 完了: `- [x]`（可能なら `YYYY-MM-DD` と証跡リンク（dev-sessions等）を併記）

### フェーズ9: 全体の完了条件

- [x] Google Programmable Search Engine（CSE）が `site:instagram.com` を中心に構成され、環境変数が設定・ドキュメント化されている - 2025-12-13（タスク3完了）
- [x] Next.js サーバーサイドの検索API（例: `/api/instagram-search`）が PoC レベルで動作し、Google CSE から取得した結果を正規化して返却できる - 2025-12-13（タスク4完了）
- [x] 複数施設向けの半自動登録フロー（候補提示→人間が採用/スキップを選ぶ）が用意され、`facilities.instagram_url` を安全に更新できる（DRY-RUN / 確認ステップを含む） - 2025-12-13（タスク5完了）
- [x] 短い施設名など精度課題に備え、検索戦略を切り替えられる（`strategy=score|rank`） - 2025-12-14（タスク4追加完了）
- [ ] Runbookに検索APIベースの標準フローと、フォールバックとしての手動ブラウザ検索フローが整理されている
- [ ] データ品質チェック（Instagramドメイン以外・重複URLの検出）が1回以上実施され、dev-sessionsに記録されている
- [ ] 対象施設が「処理済み」になっている（`instagram_url` が埋まった施設だけでなく、見つからない/判断不能な施設も「未特定（理由付き）」として一覧化されている）

### 実装タスク（セッション粒度の進捗）

- [x] [タスク1: 現状の `instagram_url` カバレッジ棚卸しと対象スコープ決定](#task-1) - 2025-12-13 ([dev-session](../../dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md))
- [x] [タスク2: Google Custom Search API 用クエリ設計 & 判定ルール整理](#task-2) - 2025-12-13 ([dev-session](../../dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md))
- [x] [タスク3: Google Programmable Search Engine & 環境変数セットアップ](#task-3) - 2025-12-13（ドキュメント反映・CSE作成・疎通確認まで完了） ([dev-session](../../dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md))
- [x] [タスク4: Next.js サーバーサイド検索API（例 `/api/instagram-search`）のPoC実装](#task-4) - 2025-12-13（実装・動作確認完了） ([dev-session](../../dev-sessions/2025/12/20251213-02-phase9-instagram-search-api-semi-auto-registration.md))
- [x] [タスク5: 複数施設向け「半自動登録ツール」の設計・実装](#task-5) - 2025-12-13（実装・動作確認完了） ([dev-session](../../dev-sessions/2025/12/20251213-02-phase9-instagram-search-api-semi-auto-registration.md))
- [x] タスク4追加: 検索戦略切替（`strategy=score|rank`）とCLI比較モード（`--compare-strategies`） - 2025-12-14 ([dev-session](../../dev-sessions/2025/12/20251214-01-phase9-instagram-search-strategy-switch.md))
- [ ] タスク4追加: 再検索抑制キャッシュ（facilityId+query+results）を設計・実装
- [ ] [タスク6: Runbook整備とデータ品質チェック](#task-6)

## 1. 概要

- **対応フェーズ**: フェーズ9
- **目的**: 一部の施設のみの状態から、全施設のInstagramアカウントURLを対象としたデータ投入・更新フローを確立する（検索APIは Google Custom Search API / Programmable Search Engine を第一候補とする）
- **スコープ**: 
  - 名古屋市内の保育施設のInstagramアカウントURLを対象とする（対象件数はタスク1で集計して確定）
  - Google Custom Search API / Programmable Search Engine を使用した検索・半自動登録フローの構築
- **非スコープ**: 
  - スケジュールURLのカバー（フェーズ10で実施）
  - 名古屋市以外の自治体の施設（将来の拡張として検討）
- **用語**:
  - **InstagramアカウントURL**: `https://www.instagram.com/<username>/` 形式のプロフィールURL（投稿URL `/p/` や `/reel/` は含めない）
- **完了条件**: 
  - 本ドキュメントの「[0. 進捗チェックリスト（正本）](#progress)」に集約（チェックも同セクションで管理）
- **関連ドキュメント**:
  - `docs/05-00-development-phases.md`（フェーズ9セクション）
  - `docs/instagram-integration/03-design-decisions.md`
  - `docs/instagram-integration/05-instagram-account-search.md`
  - `docs/04-development.md`（環境変数・Runbook）
  - `docs/dev-sessions/2025/12/20251209-01-phase9-instagram-search-api.md`（方針整理）
  - `docs/dev-sessions/2025/12/20251205-01-phase9-instagram-account-coverage.md`（手動登録の着手ログ）

## 2. 前提・制約

- **規約・利用条件**: 
  - Google Custom Search API の利用規約に従う
  - Instagram の利用規約に従い、公式APIまたは埋め込み方式を使用する（スクレイピングは避ける）
  - 検索クエリは適切な頻度で実行し、レート制限を遵守する
- **コスト・レート制限**: 
  - Google Custom Search API は1日あたり100クエリまで無料、それ以上は有料（詳細は [Google Custom Search API の料金](https://developers.google.com/custom-search/v1/overview#pricing) を参照）
  - 施設数が無料枠を超える場合は、1日あたりの検索回数を抑えつつ複数日に分けて実行できるようにする（検索の重複実行を避ける設計を含む）
- **データ品質要件**: 
  - `instagram_url` は `https://(www.|m.)instagram.com/<username>/` のプロフィールURLのみを許可する（正規化して `https://www.instagram.com/<username>/` に統一する）
  - `instagram_url` に投稿/リール/ストーリーズ等のURL（`/p/`, `/reel/`, `/tv/`, `/stories/`）が入らないこと
  - `igsh` 等のクエリパラメータやフラグメントを除去する（共有リンクのまま登録しない）
  - 同じInstagramアカウントに複数施設が紐づく場合は、意図的なケース（例: 複数拠点を運営する同一団体）以外は重複として検出する
  - 公式アカウントであることを確認する（最低限: 施設名の一致だけでなく、プロフィールの所在地/公式サイトURL/投稿内容などで関連が説明できること）
  - 見つからない/判断不能の場合は `instagram_url` を無理に埋めず、**未特定（理由付き）** として一覧化し、次回以降の再試行対象にする
- **技術的制約**: 
  - Next.js のサーバーサイド（Route Handler / API Route）で実装し、APIキーをクライアントに露出しない
  - 環境変数は `.env.local` とホスティング環境（Vercel等）の両方に設定する

## 3. 実装計画

> このセクションは、フェーズ9全体の実装計画をまとめたものです。  
> 各タスクの詳細な完了条件・検証方法・dev-sessions粒度については、個別のセッションで具体化していきます。

<a id="task-1"></a>
### タスク1: 現状の `instagram_url` カバレッジ棚卸しと対象スコープ決定

- **チェックリスト（完了条件）**:
  - [x] `facilities` テーブルについて、`instagram_url IS NOT NULL` / `IS NULL` の件数が全体および区別に集計されている - 2025-12-13
  - [x] フェーズ9で「今回一気に埋めに行く対象」（例: 名古屋市内全件 / まずは○区のみ など）が決まっている - 2025-12-13（対象区: **東区**、未登録3件）([dev-session](../../dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md))
- **検証方法**:  
  - Supabase Studio もしくは Supabase MCP で以下のようなSQLを実行し、集計結果をメモに残す
    - 例: `SELECT ward_name, COUNT(*) AS total, COUNT(instagram_url) AS with_instagram FROM facilities GROUP BY ward_name ORDER BY ward_name;`
- **dev-sessions粒度**:  
  - 1セッション（15〜30分）で棚卸しクエリ設計〜集計〜「今回の対象範囲」の言語化まで完了可能
- **更新先ドキュメント**: 
  - `docs/dev-sessions/` 配下（集計結果の記録）
  - `docs/05-09-instagram-account-url-coverage.md`（対象スコープの決定内容）

<a id="task-2"></a>
### タスク2: Google Custom Search API 用クエリ設計 & 判定ルール整理

- **チェックリスト（完了条件）**:
  - [x] `docs/instagram-integration/03-design-decisions.md` と `05-instagram-account-search.md` に、Google Custom Search API を前提にした検索クエリ例・ヒューリスティクス・あきらめ条件が追記されている - 2025-12-13
  - [x] 代表的なクエリパターン（例: `site:instagram.com "<施設名>" "<区名>" 子育て -site:instagram.com/p/ -site:instagram.com/reel/`）と、「上位N件からどう公式候補を1件に絞るか」のルールが整理されている - 2025-12-13 ([dev-session](../../dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md))
- **検証方法**:  
  - 上記2ファイルを開き、フェーズ9セクションに「Google Custom Search API 版ワークフロー」がまとまっていることを目視確認
  - 2〜3施設分について、設計したクエリを実際のGoogle検索画面で試し、想定通りの結果が出るかを手動チェック
- **dev-sessions粒度**:  
  - 1セッション（30〜45分）でクエリ案の試行 → ルール文章化までを狙う
- **更新先ドキュメント**: 
  - `docs/instagram-integration/03-design-decisions.md`
  - `docs/instagram-integration/05-instagram-account-search.md`

<a id="task-3"></a>
### タスク3: Google Programmable Search Engine & 環境変数セットアップ

- **チェックリスト（完了条件）**:
  - [x] Google Programmable Search Engine（CSE）が作成され、`site:instagram.com` もしくは必要な検索範囲に限定されている - 2025-12-13
  - [x] APIキー / CX が取得され、`GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` などの環境変数名で `.env.local` / ホスティング環境に設定済み - 2025-12-13（ローカル環境で設定完了、疎通確認成功）
  - [x] `docs/04-development.md` の環境変数一覧に Google CSE 関連が追記されている - 2025-12-13
  - [x] `apps/web/env.local.example` に Google CSE 関連の環境変数が追記されている - 2025-12-13 ([dev-session](../../dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md))
- **検証方法**:  
  - **APIキーをコマンドライン引数に露出しない**形で、Google Custom Search API からJSONレスポンスが返ることを確認する（例: Nodeのワンライナーで `process.env` からキーを読む）
    - 例（実キーを表示しない/リポジトリには追加しない）:
      ```bash
      node -e 'fetch("https://www.googleapis.com/customsearch/v1?key="+process.env.GOOGLE_CSE_API_KEY+"&cx="+process.env.GOOGLE_CSE_CX+"&q="+encodeURIComponent("site:instagram.com みらい")) .then(r=>r.json()).then(j=>console.log({ ok: !j.error, items: (j.items||[]).length, error: j.error?.message }))'
      ```
  - Next.js ローカル開発サーバー起動時に、環境変数未設定エラーが出ていないことを確認
- **dev-sessions粒度**:  
  - 1セッション（30〜60分）で CSE 作成〜キー取得〜環境変数設定〜 docs 追記までをまとめて対応
- **更新先ドキュメント**: 
  - `docs/04-development.md`（環境変数一覧）
  - `apps/web/env.local.example`（環境変数の例）
  - `docs/dev-sessions/` 配下（セットアップ手順の記録）

<a id="task-4"></a>
### タスク4: Next.js サーバーサイド検索API（例 `/api/instagram-search`）のPoC実装

- **チェックリスト（完了条件）**:
  - [x] Next.js Route Handler / API Route（サーバーサイド限定）が1つ追加されている - 2025-12-13
  - [x] 入力: `facilityId` または `facilityName` + `wardName` - 2025-12-13
  - [x] 出力: `[{ link, title, snippet, score }]` のような正規化済み候補リスト - 2025-12-13
  - [x] エラー時は統一フォーマット（400/500など）で返却 - 2025-12-13
  - [x] ローカル環境で `/api/instagram-search?facilityId=...` を叩くと、Google CSE 経由の結果がJSONで返る - 2025-12-13（動作確認完了）
  - [x] 公開悪用でクエリ枠を消費されないための最低限の防御（例: 管理トークン必須）が入っている - 2025-12-13（`ADMIN_API_TOKEN`）
  - [x] 短い施設名など精度課題に備え、検索戦略を切り替えられる（`strategy=score|rank`） - 2025-12-14
- **検証方法**:  
  - `mise exec -- pnpm --filter web dev` でローカル起動し、ブラウザ or `curl` で API を叩いてレスポンスを確認
  - ログ（コンソール or logger）で、実際に呼び出しているCSEクエリ文字列とレスポンスステータスを確認（**APIキーは絶対にログへ出さない**）
- **dev-sessions粒度**:  
  - 1〜2セッションに分割（①最小の `GET` + 固定クエリでCSEを叩く PoC、②クエリ組み立てとレスポンス正規化・エラーハンドリング）
- **更新先ドキュメント**: 
  - `apps/web/app/api/instagram-search/route.ts`（新規作成）
  - `docs/03-api.md`（API仕様の追記、必要に応じて）
  - `docs/dev-sessions/` 配下（実装メモ）

<a id="task-5"></a>
### タスク5: 複数施設向け「半自動登録ツール」の設計・実装

- **チェックリスト（完了条件）**:
  - [x] `instagram_url IS NULL` の施設に対して、一覧から1件ずつ選び → `/api/instagram-search` を叩き → 上位候補を表示 → 人間が「採用 / スキップ」を選ぶフローを実現する簡易ツール（CLI or 管理用ページ）が存在する - 2025-12-13
  - [x] ツールは直接 `facilities.instagram_url` を更新するか、少なくとも「施設ID + 採用URL」をCSV/JSONとして出力できる - 2025-12-13
  - [x] CLIで検索戦略を切り替えられる（`--strategy=score|rank`） - 2025-12-14
  - [x] DRY-RUNで比較できる（`--compare-strategies`） - 2025-12-14
  - [ ] 実データ更新（`--apply`）を「対象区1区ぶん」以上で実施し、更新証跡（バックアップ/ロールバック手順と結果）をdev-sessionsに残している
- **検証方法**:  
  - テスト用に3〜5施設を選び、ツールを1回走らせて候補確認〜採用まで一通り通す
    - ツール実行時に各施設の候補（スコア5点以上、最大9点）が表示される
    - ユーザーが「採用する候補の番号（1-N）」「s（スキップ）」「n（未特定）」を選択
    - 選択した候補が採用される（またはスキップ/未特定として記録される）
  - 実行後に Supabase Studio で `instagram_url` が期待通り更新されていることを確認
- **dev-sessions粒度**:  
  - 2〜3セッション想定（UI設計 / PoC実装 / DB更新まわりの安全装置と検証）
- **更新先ドキュメント**: 
  - `apps/scripts/` または `apps/web/app/admin/`（ツールの実装場所）
  - `docs/04-development.md`（ツールの使い方・Runbook）
  - `docs/dev-sessions/` 配下（実装メモ）

<a id="task-6"></a>
### タスク6: Runbook整備とデータ品質チェック

- **チェックリスト（完了条件）**:
  - [ ] `docs/instagram-integration/04-runbook.md` および `05-instagram-account-search.md` に「Google Custom Search API を使った標準フロー」が整理されている
  - [ ] `docs/instagram-integration/04-runbook.md` および `05-instagram-account-search.md` に「フォールバックとしてのブラウザ手動検索フロー」が整理されている
  - [ ] `docs/instagram-integration/04-runbook.md` および `05-instagram-account-search.md` に「公式候補が見つからない場合のあきらめ条件と記録方法」が整理されている
  - [ ] `facilities` に対してデータ品質チェック（Instagramドメイン以外・重複URLの検出）が1回以上実行され、結果がメモされている
- **検証方法**:  
  - Runbookと指示書を開いて、フェーズ9の実運用手順が1ドキュメントから追えるかを目視確認
  - Supabase Studio / SQL で簡易チェッククエリ（例: `SELECT instagram_url, COUNT(*) FROM facilities WHERE instagram_url IS NOT NULL GROUP BY instagram_url HAVING COUNT(*) > 1;`）を実行し、結果を dev-sessions に記録
- **dev-sessions粒度**:  
  - 1セッション（30〜45分）で Runbook更新＋簡易チェックをまとめて実施可能
- **更新先ドキュメント**: 
  - `docs/instagram-integration/04-runbook.md`
  - `docs/instagram-integration/05-instagram-account-search.md`
  - `docs/04-development.md`（必要に応じてRunbookへの参照を追加）
  - `docs/dev-sessions/` 配下（データ品質チェック結果の記録）

## 4. 品質チェック

- **データ品質チェック（チェックリスト）**:
  - [ ] `instagram_url` が `instagram.com` 以外のドメインになっていないか（**部分一致ではなく** 正規表現またはSQLで検出）
  - [ ] `instagram_url` がプロフィールURLになっているか（投稿URL `/p/` 等が混ざっていないか）
  - [ ] `instagram_url` にクエリパラメータ/フラグメントが残っていないか（共有リンクのままになっていないか）
  - [ ] 重複URL（同じInstagramアカウントに複数施設が紐づいていないか、意図したケース以外）
  - [ ] 必須フィールド（`id`, `name` 等）の欠損チェック（`instagram_url` は NULL 可だが、入っている場合は上記ルールを満たす）
- **検証クエリ例**: 
  ```sql
  -- 重複URLの検出
  SELECT instagram_url, COUNT(*) AS count
  FROM facilities 
  WHERE instagram_url IS NOT NULL 
  GROUP BY instagram_url 
  HAVING COUNT(*) > 1;
  
  -- Instagramドメイン以外のURL検出（NOT LIKE '%instagram.com%' は危険: notinstagram.com 等を誤許可する）
  SELECT id, name, instagram_url
  FROM facilities
  WHERE instagram_url IS NOT NULL 
    AND instagram_url !~* '^https?://(www\.|m\.)?instagram\.com/';

  -- 投稿/リール/ストーリーズ等が混ざっていないか（アカウントURLのみ許可）
  SELECT id, name, instagram_url
  FROM facilities
  WHERE instagram_url IS NOT NULL
    AND instagram_url ~* '^https?://(www\.|m\.)?instagram\.com/(p|reel|tv|stories)/';

  -- 共有リンクのクエリ/フラグメントが残っていないか
  SELECT id, name, instagram_url
  FROM facilities
  WHERE instagram_url IS NOT NULL
    AND (instagram_url LIKE '%?%' OR instagram_url LIKE '%#%');
  ```
- **チェック実施タイミング**: 
  - データ投入後（タスク5の半自動登録ツール実行後）
  - フェーズ完了前（タスク6で実施）

## 5. Runbook反映ポイント

最終的に `docs/04-development.md` に落とすべき運用手順のチェックリスト：

- [ ] 環境変数の設定手順（`docs/04-development.md` の環境変数セクション） - タスク3完了後にチェック
- [ ] API呼び出しの標準フロー（`docs/instagram-integration/04-runbook.md` に記載） - タスク6完了後にチェック
- [ ] フォールバック手順（標準フローが失敗した場合の代替手段） - タスク6完了後にチェック
- [ ] エラーハンドリング方針（エラー時のログ・通知・リトライ方針） - タスク4/6完了後にチェック
- [ ] データ更新フロー（手動・自動の更新手順） - タスク5/6完了後にチェック
- [ ] トラブルシューティング手順（よくある問題と対処法） - タスク6完了後にチェック

## 6. リスク・撤退条件・ロールバック

- **リスク**: 
  - Google Custom Search API のレート制限（1日100クエリ）に達する可能性（対象件数や再検索回数によっては、複数日に分ける必要がある）
  - APIキーの漏洩リスク（サーバーサイドでのみ使用し、クライアントに露出しない）
  - 外部サービスの仕様変更（Google CSE の仕様変更、Instagram の利用規約変更）
  - 検索結果の精度が低い場合、手動確認の工数が増える
- **撤退条件**: 
  - 検索APIのコストが予算を超える（現状は無料枠内で収まる想定）
  - データ品質が一定基準を下回る（例: 正しいURLの検出率が50%未満）
  - Instagram の利用規約に違反する可能性が高い場合
- **ロールバック手順**: 
  - **更新前にスナップショットを残す**（例: `id,name,ward_name,instagram_url` をCSV/JSONでエクスポートし、dev-sessionsに添付または保存先を記録）
  - 誤登録が見つかった場合は、対象 `id` の `instagram_url` を `NULL` に戻す（小さな差分で戻せる形にする）
  - 環境変数の削除（`.env.local` とホスティング環境の両方）
  - 実装したAPI Route の削除（`apps/web/app/api/instagram-search/route.ts`）
- **フォールバック手順**: 
  - 標準フロー（Google CSE）が使えない場合: ブラウザで手動検索し、結果を手動で `facilities.instagram_url` に登録する（`docs/instagram-integration/04-runbook.md` に手順を記載）
  - 検索APIが一時的に利用できない場合: 既存のデータを再利用し、新規登録は後回しにする

## 7. 将来の拡張・メモ

- **拡張候補**: 
  - 検索バックエンドの拡張: クエリ数やコストが増えた場合、Serper.dev など他の検索APIを利用する選択肢も検討する（料金・レート制限・運用性を比較）
  - CSEの検索スコープをInstagram以外の公式サイトや自治体ページに広げる場合は、誤検出リスクとパフォーマンスへの影響を評価する
  - 対象自治体の拡張: 名古屋市以外の自治体を対象にする場合、施設名やエリア表現の揺れ（ひらがな/カタカナ/漢字）を考慮したクエリパターンの追加が必要になる
- **運用上の注意**: 
  - 検索API呼び出しのログ（クエリ・レスポンス・採用/スキップ判断）を最低限残し、後から「なぜこのURLになったか」をトレースできるようにする
  - データ品質チェック（Instagramドメイン以外・重複URL）の結果を定期的にレビューし、フローやクエリルールの改善につなげる
  - 自治体サイトにInstagramリンクが直接載るようになった場合は、スクレイピングや公式リンク優先のフローに切り替えるかどうかを再検討する
- **関連する将来フェーズ**: 
  - フェーズ10: スケジュールURLの全面カバー（フェーズ9で確立したInstagramアカウントURLの検索・登録フローを参考にできる）
