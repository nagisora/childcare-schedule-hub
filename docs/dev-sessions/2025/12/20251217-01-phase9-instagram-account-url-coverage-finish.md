# チェックリスト式実装計画書: 2025-12-17

> **セッションとは**: このプロジェクトにおける「セッションの定義」は `docs/dev-sessions/session-definition.md` を参照。
>
> **重要（AI作業時）**: このファイルは `date -d "tomorrow" +%Y%m%d` の結果（`20251217`）に基づいて作成している。

## セッション概要とゴール

### 概要

- 一言サマリ: **公式サイト詳細ページのInstagram記載を一次ソースとして回収**し、足りない分だけ検索で補完して、**全施設のInstagram URL取得・更新を終わらせる**
- 対応フェーズ: フェーズ9
- セッション種別: 実装 + 実行（運用） + 検証 + ドキュメント更新
- 実行方式: ペア（人間レビューあり）
- 影響範囲: `apps/web`（検索API） / `apps/scripts`（CLI更新） / `apps/scripts/logs`（証跡） / `docs/dev-sessions`
- 日付: 2025-12-17
- 想定所要時間: 90〜180 分（状況により延長）

### ゴール

- **ゴール**: `instagram_url` の未設定を **0件（または未特定を理由付きで処理済みに）** まで持っていき、次回以降の手戻りをなくす
  - 完了条件:
    - [ ] CLIで対象全施設を走査し、**自動更新できるものはDB更新**できている（`--apply --yes`）
    - [ ] 複数候補/判断不能は、レビュー用サマリ（JSON/Markdown）に集約され、人間が採用可否を判断できる
    - [ ] `no_candidates` は、クエリ改善（括弧/揺れ・フォールバック）を適用後に再実行し、必要なら手動フォールバックに切り替えられる
  - 制約・注意点:
    - 無料枠は超えて良い（ただし無駄な再検索は避ける）
    - シークレット（APIキー/トークン）は絶対に表示・ログ出力しない

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9の正本）
- 参照: `docs/dev-sessions/2025/12/20251216-02-phase9-instagram-search-hybrid-more-measurements.md`（直近の実測・仮説・修正点）
- 参照: `docs/instagram-integration/01-investigation.md`（自治体サイトの拠点詳細ページURLと、その取得元ページ）
- 参照: `apps/scripts/instagram-semi-auto-registration.ts`（更新CLI）
- 参照: `apps/web/app/api/instagram-search/route.ts`（検索API）
- 参照: `apps/web/lib/instagram-search.ts`（クエリ生成・スコア）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - 速度優先で「終わらせる」ことを最優先（無料枠超過は許容、ただし無駄は減らす）
  - まず **名古屋市サイトの拠点詳細ページ（DBカラム: `facilities.detail_page_url`）からInstagram URLを抽出**し、取れるものはそれを正としてDB更新する（Google検索より精度が高く無駄が少ない）
    - **重要**: 名古屋市サイトの詳細ページURLは `https://www.kosodate.city.nagoya.jp/play/...` が正で、`/play/` 抜けのURLは開くと **404 (Not Found)** になることがある
      - 例: 正しいURLは `https://www.kosodate.city.nagoya.jp/play/supportbases34.html`
    - そのため、詳細ページ巡回の前に `facilities.detail_page_url` の正規化（`/play/` 抜け補完）を必ず実施する
  - 更新は「自動で安全にできる範囲（候補1件）」を最大化し、複数候補は人間レビューに回す
  - `no_candidates` はクエリ側（括弧/揺れ・フォールバック本数）をまず疑い、それでもダメなら手動検索フォールバック
- 保留中の論点 / 今回は触らないと決めたこと:
  - UIでの管理画面化（まずCLIで完走）

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & 実行内容（実装・運用・ドキュメント更新）

- [ ] タスク1: `facilities.detail_page_url` の `/play/` 抜けを修正して 404 を解消する（一次ソース抽出の前提整備）
  - 完了条件:
    - [ ] `https://www.kosodate.city.nagoya.jp/` 配下で `/play/` が欠けている `detail_page_url` を検出できている
    - [ ] 必要なレコードについて、`/play/` を補完して正しいURLに更新できている（ログ/根拠が残る）
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/scripts/fetch-nagoya-childcare-bases.ts（拠点詳細ページURL / `facilities.detail_page_url` の取得方法）
      - docs/instagram-integration/01-investigation.md（URL体系の調査結果）
    - やりたいこと:
      - `detail_page_url` の `https://www.kosodate.city.nagoya.jp/(supportbases|ouenkyoten)` 系を `.../play/...` に正規化（404回避）
      - 取得スクリプト側が `/play/` を落としているなら、まずそこを修正して再取り込みの方針を決める（DB直接更新 vs 再import）
    - 制約・注意点:
      - DB更新は影響が大きいので、対象件数・サンプルを確認してから実行する
      - 変更したURLは、数件は実際に開いて 404 でないことを確認する
    ```

- [ ] タスク2: 公式サイト詳細ページから Instagram URL を一括抽出し、取れるものはDB更新する（一次ソース優先）
  - 完了条件:
    - [ ] 拠点詳細ページURL（DB: `facilities.detail_page_url`）を持つ施設を対象に、Instagram URL が記載されているものを抽出できている（ログ/サマリが残る）
    - [ ] 記載があった施設は `instagram_url` を更新できている（`--apply --yes`）
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/scripts/fetch-nagoya-childcare-bases.ts（拠点詳細ページURL / `facilities.detail_page_url` の取得方法）
      - docs/instagram-integration/01-investigation.md（取得元ページ）
    - やりたいこと:
      - 拠点詳細ページURL（`facilities.detail_page_url`）を使って詳細ページを巡回し、Instagramリンク（プロフィールURL）を抽出
      - 抽出できたものは正規化して facilities.instagram_url を更新
      - 抽出できない/複数ある/不正形式はレビュー用に残す
    - 制約・注意点:
      - 名古屋市サイトへのアクセスはガイドラインに準拠（間隔を空ける）
      - シークレットを出さない
    ```

- [ ] タスク3: `no_candidates` 削減のための検索クエリ改善（括弧/揺れ・必要ならフォールバック本数）を仕上げる（一次ソースで埋まらない分の補完）
  - 完了条件:
    - [ ] 直近で `no_candidates` だった施設（複数件）をDRY-RUNで再実行し、改善の有無を確認できる
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/web/lib/instagram-search.ts
      - apps/web/app/api/instagram-search/route.ts
      - apps/scripts/instagram-semi-auto-registration.ts
    - やりたいこと:
      - 括弧/揺れのvariants（前日対応済み）を前提に、0件のときだけクエリ本数を増やす等のフォールバックを検討
      - 無駄な再検索を避けるため、必要なら簡易キャッシュも検討（同一実行内）
    - 制約・注意点:
      - 無料枠超過OKだが無駄遣いしない
      - シークレットを出さない
    ```

- [ ] タスク4: CLIで「自動更新できるものは更新」し、複数候補/未特定をレビューに回して全体を完走する
  - 完了条件:
    - [ ] 対象全施設を実行し、`apps/scripts/logs` に実行ログ・レビューサマリが残っている
    - [ ] `--apply --yes` による更新が完了し、必要ならバックアップからロールバック可能
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/scripts/instagram-semi-auto-registration.ts
      - docs/05-09-instagram-account-url-coverage.md
    - やりたいこと:
      - 可能なら rank主経路 + auto-adopt を使い、候補1件のみ自動採用
      - 複数候補は review-*.md に集約し、人間が採用/未特定を判断
      - 0件は triedQueries を残し、追加クエリ/手動検索へ
    - 制約・注意点:
      - `--apply` 実行前にバックアップが作られていること
      - 途中で止まっても再開できるようログを残す
    ```

- [ ] タスク5: フェーズ9の進捗・Runbook・品質チェックを更新してクローズ条件に近づける
  - 完了条件:
    - [ ] `docs/05-09-instagram-account-url-coverage.md` の進捗が更新され、証跡リンクが貼られている
    - [ ] データ品質チェック（重複URL/ドメイン/投稿URL混入など）が1回以上実施され、結果が記録されている

### 2. 検証・テスト（確認方法）

- [ ] 確認1: `mise exec -- pnpm --filter web test`
  - 期待結果: テストがすべてパスする
- [ ] 確認2: CLIのDRY-RUN（少数）
  - 期待結果: `Mode: DRY-RUN (no updates)` で、ログが生成される
- [ ] 確認3: CLIのAPPLY（本番更新）
  - 期待結果: `--apply --yes` で更新が走り、バックアップ・ログが残る

---

## 実施ログ

- スタート: TODO: HH:MM
- 実行ログ（TODO: 実行後に貼る）:
  - TODO: apps/scripts/logs/instagram-registration-...
  - TODO: apps/scripts/logs/instagram-backup-...
  - TODO: apps/scripts/logs/instagram-review-....md

## 結果とふりかえり

- 完了できたタスク:
  - [ ] タスク1
  - [ ] タスク2
  - [ ] タスク3
- 未完了タスク / 想定外だったこと:
  - TODO:
- 学び・次回改善したいこと:
  - TODO:

## 次回に持ち越すタスク

- なし（このセッションでフェーズ9を終わらせる想定。もし漏れがあれば追記し、理由と着手条件を書く）
***

## 付録（任意）

- メモ: 正本は `docs/05-09-instagram-account-url-coverage.md` / フェーズ索引は `docs/05-00-development-phases.md`
