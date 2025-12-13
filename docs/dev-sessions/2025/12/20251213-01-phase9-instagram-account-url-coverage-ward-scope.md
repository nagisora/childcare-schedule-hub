# チェックリスト式実装計画書: 2025-12-13

> **重要（AI作業時）**: このファイルは `date` コマンドで取得した日付（`20251213` → `2025-12-13`）に基づいて作成している。  
> ルール: `docs/dev-sessions/README.md` / `docs/05-00-development-phases.md#dev-sessions-date`

## セッション概要とゴール

### 概要

- 一言サマリ: フェーズ9（InstagramアカウントURL全面カバー）を「区ごと（1区）」で進めるために、棚卸し→クエリ/判定ルール→Google CSE/環境変数のセットアップ方針までを1セッションで固める
- 対応フェーズ: フェーズ9
- セッション種別: 設計 / セットアップ / ドキュメント整備
- 影響範囲: フェーズ9（InstagramアカウントURLの検索・登録フロー）
- 日付: 2025-12-13
- 想定所要時間: 90 分

### ゴール

- **ゴール**: 「対象区（1区）」を確定し、Google Custom Search API（CSE）で検索できる準備（ドキュメント＋環境変数名＋疎通確認）まで到達する
  - 完了条件:
    - 対象区（例: 東区 / 西区 など）が **1つ** 決まり、対象施設リスト（`instagram_url IS NULL`）が抽出・記録されている
    - `docs/instagram-integration/03-design-decisions.md` と `docs/instagram-integration/05-instagram-account-search.md` に「検索API前提のクエリ/判定ルール（案）」が追記されている
    - `docs/04-development.md` と `apps/web/env.local.example` に `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` の追記方針が反映され、（可能なら）ローカルで疎通確認まで完了している
  - 補足:
    - Googleコンソール（CSE作成・APIキー発行）は人間作業。時間超過しそうなら「手順＋必要情報＋詰まった点」を dev-session に残して次回へ。

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9詳細・進捗の正本）
- 参照: `docs/05-00-development-phases.md`（フェーズ9の完了条件）
- 参照: `docs/instagram-integration/03-design-decisions.md`（検索API採用方針）
- 参照: `docs/instagram-integration/05-instagram-account-search.md`（現行の手動手順。将来は検索API版へ更新予定）
- 参照: `docs/04-development.md`（環境変数管理）
- 参照: `apps/web/env.local.example`（`.env.local` テンプレ）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - スコープは **「区ごと（1区）」**で進める（東区/西区など）。名古屋市全件を一気に埋めるのではなく段階的に完了させる。
  - 検索バックエンドは **Google Custom Search API（Google Programmable Search Engine / CSE）**を第1候補とする（`docs/instagram-integration/03-design-decisions.md` の方針）。
  - APIキー等は **サーバー側のみ**で管理し、クライアントへ露出させない。ログ出力も禁止。
- 議論概要:
  - 先行セッションで「ブラウザ手動は遅い/見落としがある」課題があり、検索APIで構造化結果を取る方向に寄せることを確認した。
- 保留中の論点 / 今回は触らないと決めたこと:
  - `/api/instagram-search` の実装（タスク4）と、半自動登録ツール（タスク5）は次回以降。
  - 検索APIの精度評価（10〜20件での実測）は、CSE疎通後に実施。

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & プロンプト設計（実装・ドキュメント更新）

- [ ] タスク1: 現状の `instagram_url` カバレッジ棚卸しと「対象区（1区）」確定
      - 完了条件:
        - `facilities` の `instagram_url` が **全体**および **区別**で集計できている
        - 対象区（`ward_name = '...'`）が確定し、対象施設（`instagram_url IS NULL`）の一覧（`id,name,ward_name,address_full_raw,instagram_url`）を取得できている
        - 本ファイル（実施ログ）に集計結果と対象区決定理由が残っている
      - **実行プロンプト案**:
        ```
        フェーズ9のタスク1を実施します。

        - 参照ファイル:
          - docs/05-09-instagram-account-url-coverage.md（タスク1）
          - docs/dev-sessions/2025/12/20251213-01-phase9-instagram-account-url-coverage-ward-scope.md（本ファイル）
        - やりたいこと:
          1) Supabase（Studio または MCP）で facilities の instagram_url カバレッジを集計
             - 全体: total / with_instagram / without_instagram
             - 区別: ward_name ごとの total / with_instagram / without_instagram
          2) 「区ごと（1区）」の対象区を決める（東区/西区など）
          3) 対象区の instagram_url IS NULL の施設一覧を抽出する
        - 制約・注意点:
          - 実データ更新（UPDATE）はこのタスクでは行わない（棚卸しと対象確定のみ）
          - 区名が NULL のレコードがある場合は別枠で数を出す（後で扱う）
        ```
      - 参考SQL（コピペ用）:
        - 全体:
          ```sql
          SELECT
            COUNT(*) AS total,
            COUNT(instagram_url) AS with_instagram,
            COUNT(*) - COUNT(instagram_url) AS without_instagram
          FROM facilities;
          ```
        - 区別:
          ```sql
          SELECT
            ward_name,
            COUNT(*) AS total,
            COUNT(instagram_url) AS with_instagram,
            COUNT(*) - COUNT(instagram_url) AS without_instagram
          FROM facilities
          GROUP BY ward_name
          ORDER BY ward_name;
          ```
        - 対象区（決定後）:
          ```sql
          SELECT id, name, ward_name, address_full_raw, instagram_url
          FROM facilities
          WHERE ward_name = '<対象区>'
            AND instagram_url IS NULL
          ORDER BY name;
          ```

- [ ] タスク2: Google Custom Search API 用クエリ設計 & 判定ルール整理（区ごと前提）
      - 完了条件:
        - `docs/instagram-integration/03-design-decisions.md` と `docs/instagram-integration/05-instagram-account-search.md` に、
          - 検索API前提のクエリパターン（優先順位）
          - 公式判定ルール（上位N件から絞る基準）
          - あきらめ条件（未特定の扱い）
          が追記されている（「案」でOK）
        - 対象区（タスク1で確定した区）を例にしたクエリ例が1つ以上入っている
      - **実行プロンプト案**:
        ```
        フェーズ9のタスク2として、Google Custom Search API 前提の
        検索クエリ設計と判定ルールをドキュメントに追記してください。

        - 参照ファイル:
          - docs/instagram-integration/03-design-decisions.md
          - docs/instagram-integration/05-instagram-account-search.md
          - docs/05-09-instagram-account-url-coverage.md（タスク2の要件）
        - やりたいこと:
          - 代表クエリ（例: site:instagram.com "<施設名>" "<区名>" 子育て）を複数用意し、優先順位を決める
          - 検索結果 items[] を見たときのスコアリング観点（施設名一致/区名一致/子育て拠点ワード等）を文章化
          - 除外パターン（投稿URL /p/ /reel/ 等、クエリパラメータ付き共有URL）も明記
          - 見つからない場合は未特定（理由付き）で記録する運用を明確化
        - 制約・注意点:
          - 既存の「ブラウザ手動検索フロー」はフォールバックとして残す（削除しない）
          - スクレイピングは禁止（利用規約順守）
        ```

- [ ] タスク3: Google Programmable Search Engine（CSE）& 環境変数セットアップ（区ごと前提）
      - 完了条件:
        - （人間作業）Google CSE を作成し、APIキーとCXを取得できている
        - `docs/04-development.md` の「3.1 主要変数一覧」に `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` が追記されている
        - `apps/web/env.local.example` に `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` が追記されている
        - （可能なら）ローカルで疎通確認できている（キー値は表示しない）
      - **実行プロンプト案**:
        ```
        フェーズ9のタスク3として、Google Custom Search API（CSE）導入のために
        必要な環境変数とドキュメント反映を行ってください。

        - 参照ファイル:
          - docs/04-development.md（3. 環境変数管理）
          - apps/web/env.local.example
          - docs/05-09-instagram-account-url-coverage.md（タスク3）
        - やりたいこと:
          - docs/04-development.md の「3.1 主要変数一覧」に GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX を追記
          - env.local.example にも同じ2変数を追記（値は空）
          - `.env.local` への実値設定は人間が行う前提で、注意事項（漏洩防止）を明記
        - 制約・注意点:
          - APIキー等のシークレットは Git 管理されるファイルに絶対に書かない
          - ログ出力禁止（キーをconsole.logしない）
        ```
      - 人間作業メモ（Googleコンソール側のチェックポイント）:
        - Programmable Search Engine（CSE）を作成
        - 検索対象は `instagram.com` を中心に制限（方針）
        - Custom Search API を有効化し APIキーを発行
        - CX（検索エンジンID）を取得
      - 疎通確認（キーを引数に露出しない形）:
        ```bash
        node -e 'fetch("https://www.googleapis.com/customsearch/v1?key="+process.env.GOOGLE_CSE_API_KEY+"&cx="+process.env.GOOGLE_CSE_CX+"&q="+encodeURIComponent("site:instagram.com みらい")) .then(r=>r.json()).then(j=>console.log({ ok: !j.error, items: (j.items||[]).length, error: j.error?.message }))'
        ```

### 2. 検証・テスト（確認方法）

- [ ] 確認1: タスク1の集計結果が「全体」と「区別」で残っていることを確認
      - 期待結果: 数字（total/with/without）が記録され、対象区（1区）が決定している
- [ ] 確認2: タスク2の追記が2ファイルに入り、「検索API版（案）」として読めることを目視確認
      - 期待結果: クエリ例、判定ルール、あきらめ条件が1ドキュメント内で追える
- [ ] 確認3（任意）: タスク3の疎通確認コマンドを実行し、`{ ok: true, items: <number> }` が出る
      - 期待結果: `ok: true`（errorが出ない）。キー値は出力されない

---

## 実施ログ

- スタート: 09:42
- メモ:
  - **タスク1: 棚卸し結果（2025-12-13時点）**
    - 全体集計:
      - 全施設数: 61件
      - Instagram URL登録済み: 17件
      - Instagram URL未登録: 44件
    - 区別集計（ward_nameごと）:
      | 区名 | 全件数 | 登録済み | 未登録 |
      |------|--------|----------|--------|
      | 中区 | 1 | 1 | 0 |
      | 中川区 | 8 | 8 | 0 |
      | 中村区 | 4 | 2 | 2 |
      | 北区 | 3 | 2 | 1 |
      | 千種区 | 4 | 0 | 4 |
      | 南区 | 3 | 0 | 3 |
      | 名東区 | 4 | 0 | 4 |
      | 天白区 | 4 | 0 | 4 |
      | 守山区 | 5 | 0 | 5 |
      | 昭和区 | 3 | 3 | 0 |
      | **東区** | **3** | **0** | **3** |
      | 港区 | 6 | 0 | 6 |
      | 熱田区 | 1 | 0 | 1 |
      | 瑞穂区 | 2 | 0 | 2 |
      | 緑区 | 8 | 0 | 8 |
      | 西区 | 2 | 1 | 1 |
    - **対象区決定: 東区**
      - 理由: 未登録数が3件と少なく、PoCとして検証しやすい規模のため
    - **東区の未登録施設一覧**（`instagram_url IS NULL`）:
      1. `あおぞらわらばぁ～` (id: `63a69b16-11f3-41ad-9485-7e5546e35d5b`, 住所: 東区東大曾根町6-21)
      2. `いずみ` (id: `b9dc8567-9a45-4251-9f8a-b7e997d54a7b`, 住所: 東区泉二丁目5-26泉ロイヤルビル2B)
      3. `やだっこひろば` (id: `3e7f8366-981f-41fe-b25b-6e41b74c0d3b`, 住所: 東区矢田三丁目3-44やだ保育園2階)
    - 補足: `ward_name IS NULL` のレコードは0件（データ品質OK）

## 結果とふりかえり

- 完了できたタスク:
  - [ ] タスク1:
  - [ ] タスク2:
  - [ ] タスク3:
- 未完了タスク / 想定外だったこと:
  - [ ] （例: Googleコンソール作業に想定以上に時間がかかった）
- 学び・次回改善したいこと:
  - （例: クエリ優先順位の改善、未特定の記録テンプレ整備）

## 次回に持ち越すタスク

- [ ] タスク4: Next.js サーバーサイド検索API（例 `/api/instagram-search`）のPoC実装
- [ ] タスク5: 半自動登録フロー（候補提示→採用/スキップ）の設計・実装
- [ ] 対象区の施設に対して、検索APIで 10〜20件の精度測定（成功/失敗パターン記録）

***

## 付録（任意）

- フェーズ9の進捗正本: `docs/05-09-instagram-account-url-coverage.md`

