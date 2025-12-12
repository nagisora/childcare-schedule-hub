# フェーズ9詳細: InstagramアカウントURLの全面カバー

## 1. 概要

- **対応フェーズ**: フェーズ9
- **目的**: 一部の施設のみの状態から、全施設のInstagramアカウントURLを対象としたデータ投入・更新フローを確立する（検索APIは Google Custom Search API / Programmable Search Engine を第一候補とする）
- **スコープ**: 
  - 名古屋市内の保育施設（現在65件）のInstagramアカウントURLを対象とする
  - Google Custom Search API / Programmable Search Engine を使用した検索・半自動登録フローの構築
- **非スコープ**: 
  - スケジュールURLのカバー（フェーズ10で実施）
  - 名古屋市以外の自治体の施設（将来の拡張として検討）
- **完了条件**: 
  - Google Programmable Search Engine（CSE）が `site:instagram.com` を中心に構成され、環境変数が設定・ドキュメント化されている
  - Next.js サーバーサイドの検索API（例: `/api/instagram-search`）が PoC レベルで動作し、Google CSE から取得した結果を正規化して返却できる
  - 複数施設向けの半自動登録フロー（候補提示→人間が採用/スキップを選ぶ）が用意され、`facilities.instagram_url` を更新できる
  - Runbookに検索APIベースの標準フローと、フォールバックとしての手動ブラウザ検索フローが整理されている
  - データ品質チェック（Instagramドメイン以外・重複URLの検出）が1回以上実施され、dev-sessionsに記録されている
- **関連ドキュメント**:
  - `docs/05-00-development-phases.md`（フェーズ9セクション）
  - `docs/instagram-integration/03-design-decisions.md`
  - `docs/instagram-integration/05-instagram-account-search.md`
  - `docs/04-development.md`（環境変数・Runbook）
  - `docs/dev-sessions/202512xx-01-phase9-google-custom-search-setup.md`（代表セッション）

## 2. 前提・制約

- **規約・利用条件**: 
  - Google Custom Search API の利用規約に従う
  - Instagram の利用規約に従い、公式APIまたは埋め込み方式を使用する（スクレイピングは避ける）
  - 検索クエリは適切な頻度で実行し、レート制限を遵守する
- **コスト・レート制限**: 
  - Google Custom Search API は1日あたり100クエリまで無料、それ以上は有料（詳細は [Google Custom Search API の料金](https://developers.google.com/custom-search/v1/overview#pricing) を参照）
  - 施設数が65件の場合、1日あたりの検索回数は100件以内に収める必要がある（必要に応じて複数日に分ける）
- **データ品質要件**: 
  - `instagram_url` は `instagram.com` ドメインのURLのみを許可する
  - 同じInstagramアカウントに複数施設が紐づく場合は、意図的なケース（例: 複数拠点を運営する同一団体）以外は重複として検出する
  - 公式アカウントであることを確認する（施設名・区名が一致することを最低限の条件とする）
- **技術的制約**: 
  - Next.js のサーバーサイド（Route Handler / API Route）で実装し、APIキーをクライアントに露出しない
  - 環境変数は `.env.local` とホスティング環境（Vercel等）の両方に設定する

## 3. 実装計画

> このセクションは、フェーズ9全体の実装計画をまとめたものです。  
> 各タスクの詳細な完了条件・検証方法・dev-sessions粒度については、個別のセッションで具体化していきます。

### タスク1: 現状の `instagram_url` カバレッジ棚卸しと対象スコープ決定

- **完了条件**:  
  - `facilities` テーブルについて、`instagram_url IS NOT NULL` / `IS NULL` の件数が全体および区別に集計されている
  - フェーズ9で「今回一気に埋めに行く対象」（例: 名古屋市内全65件 / まずは○区のみ など）が決まっている
- **検証方法**:  
  - Supabase Studio もしくは Supabase MCP で以下のようなSQLを実行し、集計結果をメモに残す
    - 例: `SELECT ward_name, COUNT(*) AS total, COUNT(instagram_url) AS with_instagram FROM facilities GROUP BY ward_name ORDER BY ward_name;`
- **dev-sessions粒度**:  
  - 1セッション（15〜30分）で棚卸しクエリ設計〜集計〜「今回の対象範囲」の言語化まで完了可能
- **更新先ドキュメント**: 
  - `docs/dev-sessions/*`（集計結果の記録）
  - `docs/05-09-instagram-account-url-coverage.md`（対象スコープの決定内容）

### タスク2: Google Custom Search API 用クエリ設計 & 判定ルール整理

- **完了条件**:  
  - `docs/instagram-integration/03-design-decisions.md` と `05-instagram-account-search.md` に、Google Custom Search API を前提にした検索クエリ例・ヒューリスティクス・あきらめ条件が追記されている
  - 代表的なクエリパターン（例: `site:instagram.com "<施設名>" "<区名>" 子育て -site:instagram.com/p/ -site:instagram.com/reel/`）と、「上位N件からどう公式候補を1件に絞るか」のルールが整理されている
- **検証方法**:  
  - 上記2ファイルを開き、フェーズ9セクションに「Google Custom Search API 版ワークフロー」がまとまっていることを目視確認
  - 2〜3施設分について、設計したクエリを実際のGoogle検索画面で試し、想定通りの結果が出るかを手動チェック
- **dev-sessions粒度**:  
  - 1セッション（30〜45分）でクエリ案の試行 → ルール文章化までを狙う
- **更新先ドキュメント**: 
  - `docs/instagram-integration/03-design-decisions.md`
  - `docs/instagram-integration/05-instagram-account-search.md`

### タスク3: Google Programmable Search Engine & 環境変数セットアップ

- **完了条件**:  
  - Google Programmable Search Engine（CSE）が作成され、`site:instagram.com` もしくは必要な検索範囲に限定されている
  - APIキー / CX が取得され、`GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` などの環境変数名で `.env.local` / ホスティング環境に設定済み
  - `docs/04-development.md` の環境変数一覧に Google CSE 関連が追記されている
- **検証方法**:  
  - `curl` や一時的な小さなスクリプト（ローカル）で `https://www.googleapis.com/customsearch/v1` を叩き、サンプルクエリでJSONレスポンスが返ることを確認
  - Next.js ローカル開発サーバー起動時に、環境変数未設定エラーが出ていないことを確認
- **dev-sessions粒度**:  
  - 1セッション（30〜60分）で CSE 作成〜キー取得〜環境変数設定〜 docs 追記までをまとめて対応
- **更新先ドキュメント**: 
  - `docs/04-development.md`（環境変数一覧）
  - `apps/web/env.local.example`（環境変数の例）
  - `docs/dev-sessions/*`（セットアップ手順の記録）

### タスク4: Next.js サーバーサイド検索API（例 `/api/instagram-search`）のPoC実装

- **完了条件**:  
  - Next.js Route Handler / API Route（サーバーサイド限定）が1つ追加され、
    - 入力: `facilityId` または `facilityName` + `wardName`
    - 出力: `[{ link, title, snippet, score }]` のような正規化済み候補リスト
    - エラー時は統一フォーマット（400/500など）で返却
  - ローカル環境で `/api/instagram-search?facilityId=...` を叩くと、Google CSE 経由の結果がJSONで返る
- **検証方法**:  
  - `mise exec -- pnpm --filter web dev` でローカル起動し、ブラウザ or `curl` で API を叩いてレスポンスを確認
  - ログ（コンソール or logger）で、実際に呼び出しているCSEクエリ文字列とレスポンスステータスを確認
- **dev-sessions粒度**:  
  - 1〜2セッションに分割（①最小の `GET` + 固定クエリでCSEを叩く PoC、②クエリ組み立てとレスポンス正規化・エラーハンドリング）
- **更新先ドキュメント**: 
  - `apps/web/app/api/instagram-search/route.ts`（新規作成）
  - `docs/03-api.md`（API仕様の追記、必要に応じて）
  - `docs/dev-sessions/*`（実装メモ）

### タスク5: 複数施設向け「半自動登録ツール」の設計・実装

- **完了条件**:  
  - `instagram_url IS NULL` の施設に対して、
    - 一覧から1件ずつ選び → `/api/instagram-search` を叩き → 上位候補を表示 → 人間が「採用 / スキップ」を選ぶ
    というフローを実現する簡易ツール（CLI or 管理用ページ）が存在する
  - ツールは直接 `facilities.instagram_url` を更新するか、少なくとも「施設ID + 採用URL」をCSV/JSONとして出力できる
- **検証方法**:  
  - テスト用に3〜5施設を選び、ツールを1回走らせて候補確認〜採用まで一通り通す
  - 実行後に Supabase Studio で `instagram_url` が期待通り更新されていることを確認
- **dev-sessions粒度**:  
  - 2〜3セッション想定（UI設計 / PoC実装 / DB更新まわりの安全装置と検証）
- **更新先ドキュメント**: 
  - `apps/scripts/` または `apps/web/app/admin/`（ツールの実装場所）
  - `docs/04-development.md`（ツールの使い方・Runbook）
  - `docs/dev-sessions/*`（実装メモ）

### タスク6: Runbook整備とデータ品質チェック

- **完了条件**:  
  - `docs/instagram-integration/04-runbook.md` および `05-instagram-account-search.md` に、
    - 「Google Custom Search API を使った標準フロー」
    - 「フォールバックとしてのブラウザ手動検索フロー」
    - 「公式候補が見つからない場合のあきらめ条件と記録方法」
    が整理されている
  - `facilities` に対して以下の観点のデータチェックが1回以上実行され、結果がメモされている
    - `instagram_url` が `instagram.com` 以外のドメインになっていないか
    - 重複URL（同じInstagramアカウントに複数施設が紐づいていないか、意図したケース以外）
- **検証方法**:  
  - Runbookと指示書を開いて、フェーズ9の実運用手順が1ドキュメントから追えるかを目視確認
  - Supabase Studio / SQL で簡易チェッククエリ（例: `SELECT instagram_url, COUNT(*) FROM facilities WHERE instagram_url IS NOT NULL GROUP BY instagram_url HAVING COUNT(*) > 1;`）を実行し、結果を dev-sessions に記録
- **dev-sessions粒度**:  
  - 1セッション（30〜45分）で Runbook更新＋簡易チェックをまとめて実施可能
- **更新先ドキュメント**: 
  - `docs/instagram-integration/04-runbook.md`
  - `docs/instagram-integration/05-instagram-account-search.md`
  - `docs/04-development.md`（必要に応じてRunbookへの参照を追加）
  - `docs/dev-sessions/*`（データ品質チェック結果の記録）

## 4. 品質チェック

- **データ品質チェック**: 
  - `instagram_url` が `instagram.com` 以外のドメインになっていないか（正規表現またはSQLで検出）
  - 重複URL（同じInstagramアカウントに複数施設が紐づいていないか、意図したケース以外）
  - 必須フィールド（`facility_id`, `instagram_url`）の欠損チェック
- **検証クエリ例**: 
  ```sql
  -- 重複URLの検出
  SELECT instagram_url, COUNT(*) AS count
  FROM facilities 
  WHERE instagram_url IS NOT NULL 
  GROUP BY instagram_url 
  HAVING COUNT(*) > 1;
  
  -- Instagramドメイン以外のURL検出
  SELECT id, name, instagram_url
  FROM facilities
  WHERE instagram_url IS NOT NULL 
    AND instagram_url NOT LIKE '%instagram.com%';
  ```
- **チェック実施タイミング**: 
  - データ投入後（タスク5の半自動登録ツール実行後）
  - フェーズ完了前（タスク6で実施）

## 5. Runbook反映ポイント

最終的に `docs/04-development.md` に落とすべき運用手順のチェックリスト：

- [x] 環境変数の設定手順（`docs/04-development.md` の環境変数セクション） - タスク3で実施
- [ ] API呼び出しの標準フロー（`docs/instagram-integration/04-runbook.md` に記載） - タスク6で実施
- [ ] フォールバック手順（標準フローが失敗した場合の代替手段） - タスク6で実施
- [ ] エラーハンドリング方針（エラー時のログ・通知・リトライ方針） - タスク4で実装、タスク6でRunbook化
- [ ] データ更新フロー（手動・自動の更新手順） - タスク5で実装、タスク6でRunbook化
- [ ] トラブルシューティング手順（よくある問題と対処法） - タスク6で実施

## 6. リスク・撤退条件・ロールバック

- **リスク**: 
  - Google Custom Search API のレート制限（1日100クエリ）に達する可能性（施設数が65件の場合、複数日に分ける必要がある）
  - APIキーの漏洩リスク（サーバーサイドでのみ使用し、クライアントに露出しない）
  - 外部サービスの仕様変更（Google CSE の仕様変更、Instagram の利用規約変更）
  - 検索結果の精度が低い場合、手動確認の工数が増える
- **撤退条件**: 
  - 検索APIのコストが予算を超える（現状は無料枠内で収まる想定）
  - データ品質が一定基準を下回る（例: 正しいURLの検出率が50%未満）
  - Instagram の利用規約に違反する可能性が高い場合
- **ロールバック手順**: 
  - データベースのバックアップからの復元（Supabase Studio または MCP を使用）
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
