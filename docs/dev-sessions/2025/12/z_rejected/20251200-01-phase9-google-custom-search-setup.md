# チェックリスト式実装計画書（下書き）: 2025-12-xx

> **重要（AI作業時）**: このテンプレートからファイルを作成する際は、**必ず `date` コマンドを実行して現在日付を取得し、その日付を使用すること**。AIの内部的な日付認識に依存せず、システムの現在日付を確認すること。詳細は `docs/05-00-development-phases.md` の「dev-sessions ファイルの日付の付け方（AI作業時の標準フロー）」を参照。

## セッション概要とゴール

### 概要

- 一言サマリ: フェーズ9のGoogle Custom Search API導入に向けて、環境変数設計とドキュメント反映方針を整理する
- 対応フェーズ: フェーズ9
- 日付: 2025-12-xx（実施日未定）
- 想定所要時間: 25〜60 分
  - 注: このファイルは「作業しようとしたがドキュメント整備に脱線した」ため、**下書きとして残している**。実施する際は命名ルールに従って当日の `YYYYMMDD-連番-...` にリネームして使う。

### ゴール

- **ゴール**: Google Custom Search API（Programmable Search Engine）の導入方針と検索スコープを整理し、必要な環境変数の命名・スコープ・配置ポリシーを決めて、どのドキュメントにどう反映するか設計する
  - 完了条件: 
    - Google Custom Search API / Programmable Search Engine 用の環境変数名（例: `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX`）とスコープ（クライアント/サーバー）が決まっている
    - `docs/04-development.md` の「主要変数一覧」と `apps/web/env.local.example` にどのような行を追加するか、具体的な差分案が文章でまとまっている
    - APIキーをクライアントに露出させないための注意点がコメントとして明文化されている
    - 次のセッションで実装に使える具体的な「AIへの実行プロンプト案」が用意されている
  - 補足: 本日は時間がなくなりましたので、このセッションは明日以降に実施予定です。

### 関連ドキュメント
- 参照: `docs/05-00-development-phases.md`（フェーズ9のセクション） / `docs/05-09-instagram-account-url-coverage.md` / `docs/instagram-integration/03-design-decisions.md` / `docs/instagram-integration/05-instagram-account-search.md` / `docs/instagram-integration/ai-comparisons/search-api-comparison.md` / `docs/instagram-integration/ai-comparisons/summary.md` / `docs/04-development.md` / `apps/web/env.local.example`

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - フェーズ9では、全施設の Instagram アカウントURLカバーのために、ブラウザ操作ベースではなく検索API（第一候補として Google Custom Search API）を使う方針とした。
  - ai-comparisons の検討結果から、DuckDuckGo Search は本番運用では採用せず、Serper.dev はクエリ数増加時など将来の拡張候補として位置づける。
  - まずは Google Custom Search API の無料枠（1日100クエリ）内で運用する想定で、Programmable Search Engine を `site:instagram.com` を中心としたスコープで構成する。
  - 検索APIの呼び出しは Next.js のサーバーサイド（Route Handler / API Route）からのみ行い、APIキー等のシークレットは `.env.local` / ホスティング環境のサーバー専用環境変数として管理する。
  - 既存のブラウザ手動検索フロー（`docs/instagram-integration/05-instagram-account-search.md`）は、検索APIフローが安定するまではフォールバック手順として維持する。
- 議論概要:
  - `phase-planning` コマンドでフェーズ9の実装計画を議論し、Google Custom Search API を第1候補として採用する方針を決定した。
  - 検索API候補の比較結果を踏まえて、「このプロジェクトでは最初からGoogle Custom Search APIを使う」方針を明文化した。
- 保留中の論点 / 今回は触らないと決めたこと:
  - Serper.dev や他検索APIへの切り替え条件（クエリ数・コストの閾値）は、本セッションでは決めず、今後の利用状況を見て検討する。
  - Google CSE の検索UI埋め込みなど、REST API 利用に不要な設定項目は扱わず、最小構成に絞る。

---

## 実装チェックリスト（本セッションにおける）

> このセクションが、このセッションの「チェックリスト式実装計画書」です。  
> **作業を始める前に必ずこのチェックリストを埋めてから着手する**ことを推奨します。

### 1. 作業タスク & プロンプト設計（実装・ドキュメント更新）

> 各タスクは「1回のAI指示（プロンプト）で完結する粒度」まで分解し、指示内容を事前に設計してください。
> 目安: **1タスク = 1プロンプト + 確認まで15〜30分**。大きいと感じたら分割を検討。
> タスク数は1〜3個を目安とし、不要な行は削除してかまいません。
> プロンプトのコツ: 参照ファイル/関数名を明記・期待アウトプット/制約を書く・変更範囲を限定する。

- [ ] タスク1: Google Custom Search API 用の環境変数設計とドキュメント反映方針を決める
      - 完了条件: 
        - Google Custom Search API / Programmable Search Engine 用の環境変数名（例: `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX`）とスコープ（クライアント/サーバー）が決まっている
        - `docs/04-development.md` の「主要変数一覧」と `apps/web/env.local.example` にどのような行を追加するか、具体的な差分案が文章でまとまっている
        - APIキーをクライアントに露出させないための注意点がコメントとして明文化されている
      - **実行プロンプト案**:
        ```
        docs/instagram-integration/03-design-decisions.md と
        docs/instagram-integration/ai-comparisons/search-api-comparison.md を前提に、
        Google Custom Search API（Programmable Search Engine）導入に必要な環境変数設計と
        ドキュメント更新方針を具体化してください。

        - 参照ファイル:
          - docs/04-development.md（3. 環境変数管理セクション）
          - apps/web/env.local.example
          - docs/instagram-integration/03-design-decisions.md
        - やりたいこと:
          - Google Custom Search API 用の環境変数名（例: GOOGLE_CSE_API_KEY, GOOGLE_CSE_CX）と、クライアント/サーバーどちらから参照するかの方針を決める
          - 上記を 04 開発ガイドの「主要変数一覧」および env.local.example に追記する差分案（追加する行とコメント）を提案する
          - APIキーをクライアントに露出させないための注意点を、コメントとして明確に書く
        - 制約・注意点:
          - 実際のキー値はダミーとし、Git 管理されるファイルにシークレットを書かない
          - 既存の環境変数セクションの書き方・トーンに合わせる
        ```
- [ ] タスク2（任意）: Google Programmable Search Engine の最小セットアップ手順を整理する
      - 完了条件: 
        - CSE 作成〜検索対象サイト指定〜 API 有効化〜 APIキー発行〜 CX 取得までの高レベル手順が 5〜10 ステップ程度の箇条書きでまとまっている
        - その手順をどのドキュメント（例: `docs/instagram-integration/03-design-decisions.md` または `04-runbook.md`）に追記するかが決まっている
        - 無料枠やレート制限、検証用・本番用をどう運用するかのメモが含まれている
      - **実行プロンプト案**:
        ```
        Google Custom Search API を使う前提で、
        Google Programmable Search Engine（CSE）の最小セットアップ手順を
        docs/instagram-integration/03-design-decisions.md か
        docs/instagram-integration/04-runbook.md のどちらかに追記できるよう整理してください。

        - 参照ファイル:
          - docs/instagram-integration/03-design-decisions.md
          - docs/04-development.md（既存の外部サービス設定の書きぶりを参考にする）
        - やりたいこと:
          - CSE 作成〜サイト指定（site:instagram.com など）〜 API 有効化〜 API キー発行〜 CX 取得 までの手順を、5〜10ステップの箇条書きにまとめる
          - 無料枠やレート制限、および「検証用と本番用で同じ CSE を使うか」の方針メモを追加する
        - 制約・注意点:
          - 具体的なコンソールURLやスクリーンショットは省略し、高レベル手順にとどめる
          - APIキーの扱い・公開禁止について一言注意書きを入れる
        ```

### 2. 検証・テスト（確認方法）

- [ ] 確認1: 本セッションで作成したタスク定義とプロンプト案を読み直し、次回以降のセッションでそのまま実行に使えるかセルフレビューする
      - 期待結果: 後続セッションでこのファイルを開くだけで「どのファイルをどう編集するか」「どんなプロンプトを投げればよいか」が分かる状態になっている
- [ ] 確認2（任意）: 環境変数や CSE 設定の方針が、docs/01〜04 の既存方針（環境変数管理・外部サービス利用ポリシー）と矛盾していないかを確認する
      - 期待結果: 矛盾や重複があれば、このセッションのうちにメモし、次回セッションでドキュメント更新タスクとして扱えるようになっている
> 例: 将来の実装セッションでは `pnpm lint` / `pnpm test` / ローカルでの API 呼び出し確認などを追加する。

---

## 実施ログ
- スタート: HH:MM
- メモ:
  - 

## 結果とふりかえり

- 完了できたタスク:
  - [x] 
  - [x] 
- 未完了タスク / 想定外だったこと:
  - [ ] 
- 学び・次回改善したいこと:
  - 

## 次回に持ち越すタスク

- [ ] 
- [ ] 
***

## 付録（任意）

> **以下、`phase-planning` コマンドでの議論結果全文を記載**

### フェーズ9: InstagramアカウントURLの全面カバー – 実装計画ラフ

> 本セクションは、`phase-planning` コマンドで議論したフェーズ9全体の実装計画をまとめたものです。  
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

---

### 次の dev-sessions（1回分）の候補タスク

> 以下は、フェーズ9の実装計画から「次の1セッション（15〜60分）でやると良いタスク候補」をピックアップしたものです。  
> 各タスクについて、`template-session.md` の「作業タスク & プロンプト設計」セクションにそのまま貼れる形で、完了条件と実行プロンプト案を記載しています。

#### 候補2: `/api/instagram-search` Route Handler のPoC実装設計

- **タスク名**: Next.js Route Handler で Google Custom Search API を叩く最小PoCの設計  
- **完了条件**:  
  - `/api/instagram-search`（パスは暫定でOK）のインターフェース（クエリパラメータ / レスポンスJSON形式）が決まっている  
  - TypeScript での実装イメージ（擬似コード＋エラーハンドリング方針）が docs またはメモとして残っており、後続セッションでそのままコピペ実装できる状態になっている  
- **実行プロンプト案**:  
  ```text
  docs/instagram-integration/03-design-decisions.md の
  「フェーズ9以降: InstagramアカウントURL検索フローの方針」を前提に、
  Next.js の Route Handler（App Router）で
  `/api/instagram-search` のPoC設計をしてください。

  要件:
  - 入力: `facilityId`（必須）または `facilityName` + `wardName`
  - 出力: `[{ link, title, snippet, score }]` の配列＋メタ情報（使用したクエリなど）
  - 内部で Google Custom Search API（GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX）を使用
  - タイムアウト / リトライ / エラー時のHTTPステータスの方針も決める

  このセッションではコード編集は行わず、
  apps/web/app/api/instagram-search/route.ts に実装することを想定した
  TypeScriptの擬似コードと、エラーハンドリングポリシーをMarkdownでまとめてください。
  ```

#### 候補3: クエリ設計とサンプル施設での手動検証

- **タスク名**: 代表施設数件を使った Google 検索クエリのチューニング  
- **完了条件**:  
  - 代表的な3〜5施設について、  
    - `site:instagram.com "<施設名>" "<区名>" 子育て -site:instagram.com/p/ -site:instagram.com/reel/` などのクエリを実際に試し、  
    - 上位1〜3件から高い確率で公式アカウント候補が取れることを確認している  
  - うまくいかないケースがあれば、そのパターンと代替クエリ（例: 区名を外す / 「子育て」を追加する等）がメモされている  
- **実行プロンプト案**:  
  ```text
  docs/instagram-integration/ai-comparisons/search-api-comparison.md と
  summary.md を参照しつつ、

  代表的な3〜5施設（中区・中川区など）をピックアップして、
  Google検索で実際に試すべきクエリパターンと、
  それぞれの成功率・失敗パターンを整理してください。

  ブラウザでの手動検索を前提とし、
  - 使うクエリ文字列の候補（3〜5個）
  - それぞれの「うまくいきやすい条件」「うまくいきにくいケース」
  - フェーズ9で標準としたいクエリの優先順位

  をMarkdownの表形式でまとめてください。
  実際の検索操作自体は私がブラウザで行うので、
  「どのクエリを、どの順番で、何を見て評価すればよいか」を明確にすることに集中してください。
  ```
