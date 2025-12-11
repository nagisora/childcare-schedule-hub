# フェーズ9詳細: InstagramアカウントURLの全面カバー

## 1. 概要

- **対応フェーズ**: フェーズ9
- **目的**: 一部の施設のみの状態から、全施設のInstagramアカウントURLを対象としたデータ投入・更新フローを確立する（検索APIは Google Custom Search API / Programmable Search Engine を第一候補とする）
- **関連ドキュメント**:
  - `docs/05-00-development-phases.md`（フェーズ9セクション）
  - `docs/instagram-integration/03-design-decisions.md`
  - `docs/instagram-integration/05-instagram-account-search.md`
  - `docs/04-development.md`（環境変数・Runbook）
  - `docs/dev-sessions/202512xx-01-phase9-google-custom-search-setup.md`（代表セッション）

## 2. フェーズ9 実装計画

> このセクションは、`phase-planning` コマンドで議論したフェーズ9全体の実装計画をまとめたものです。  
> 各タスクの詳細な完了条件・検証方法・dev-sessions粒度については、個別のセッションで具体化していきます。

- [ ] **タスク1: 現状の `instagram_url` カバレッジ棚卸しと対象スコープ決定**  
      - **完了条件**:  
        - `facilities` テーブルについて、`instagram_url IS NOT NULL` / `IS NULL` の件数が全体および区別に集計されている  
        - フェーズ9で「今回一気に埋めに行く対象」（例: 名古屋市内全65件 / まずは○区のみ など）が決まっている  
      - **検証方法**:  
        - Supabase Studio もしくは Supabase MCP で以下のようなSQLを実行し、集計結果をメモに残す  
          - 例: `SELECT ward_name, COUNT(*) AS total, COUNT(instagram_url) AS with_instagram FROM facilities GROUP BY ward_name ORDER BY ward_name;`  
      - **dev-sessions粒度**:  
        - 1セッション（15〜30分）で棚卸しクエリ設計〜集計〜「今回の対象範囲」の言語化まで完了可能  

- [ ] **タスク2: Google Custom Search API 用クエリ設計 & 判定ルール整理**  
      - **完了条件**:  
        - `docs/instagram-integration/03-design-decisions.md` と `05-instagram-account-search.md` に、Google Custom Search API を前提にした検索クエリ例・ヒューリスティクス・あきらめ条件が追記されている  
        - 代表的なクエリパターン（例: `site:instagram.com "<施設名>" "<区名>" 子育て -site:instagram.com/p/ -site:instagram.com/reel/`）と、「上位N件からどう公式候補を1件に絞るか」のルールが整理されている  
      - **検証方法**:  
        - 上記2ファイルを開き、フェーズ9セクションに「Google Custom Search API 版ワークフロー」がまとまっていることを目視確認  
        - 2〜3施設分について、設計したクエリを実際のGoogle検索画面で試し、想定通りの結果が出るかを手動チェック  
      - **dev-sessions粒度**:  
        - 1セッション（30〜45分）でクエリ案の試行 → ルール文章化までを狙う  

- [ ] **タスク3: Google Programmable Search Engine & 環境変数セットアップ**  
      - **完了条件**:  
        - Google Programmable Search Engine（CSE）が作成され、`site:instagram.com` もしくは必要な検索範囲に限定されている  
        - APIキー / CX が取得され、`GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` などの環境変数名で `.env.local` / ホスティング環境に設定済み  
        - `docs/04-development.md` の環境変数一覧に Google CSE 関連が追記されている  
      - **検証方法**:  
        - `curl` や一時的な小さなスクリプト（ローカル）で `https://www.googleapis.com/customsearch/v1` を叩き、サンプルクエリでJSONレスポンスが返ることを確認  
        - Next.js ローカル開発サーバー起動時に、環境変数未設定エラーが出ていないことを確認  
      - **dev-sessions粒度**:  
        - 1セッション（30〜60分）で CSE 作成〜キー取得〜環境変数設定〜 docs 追記までをまとめて対応  

- [ ] **タスク4: Next.js サーバーサイド検索API（例 `/api/instagram-search`）のPoC実装**  
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

- [ ] **タスク5: 複数施設向け「半自動登録ツール」の設計・実装**  
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

- [ ] **タスク6: Runbook整備とデータ品質チェック**  
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

## 3. 将来の拡張・メモ

- **検索バックエンドの拡張**: 
  - クエリ数やコストが増えた場合、Serper.dev など他の検索APIを利用する選択肢も検討する（料金・レート制限・運用性を比較）。
  - CSEの検索スコープをInstagram以外の公式サイトや自治体ページに広げる場合は、誤検出リスクとパフォーマンスへの影響を評価する。
- **対象自治体の拡張**:
  - 名古屋市以外の自治体を対象にする場合、施設名やエリア表現の揺れ（ひらがな/カタカナ/漢字）を考慮したクエリパターンの追加が必要になる。
  - 自治体サイトにInstagramリンクが直接載るようになった場合は、スクレイピングや公式リンク優先のフローに切り替えるかどうかを再検討する。
- **運用まわり**:
  - 検索API呼び出しのログ（クエリ・レスポンス・採用/スキップ判断）を最低限残し、後から「なぜこのURLになったか」をトレースできるようにする。
  - データ品質チェック（Instagramドメイン以外・重複URL）の結果を定期的にレビューし、フローやクエリルールの改善につなげる。
