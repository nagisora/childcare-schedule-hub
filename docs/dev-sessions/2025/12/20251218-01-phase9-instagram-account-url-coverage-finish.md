# チェックリスト式実装計画書: 2025-12-18

> **セッションとは**: このプロジェクトにおける「セッションの定義」は `docs/dev-sessions/session-definition.md` を参照。

## セッション概要とゴール

### 概要

- 一言サマリ: **公式サイト詳細ページのInstagram記載を一次ソースとして回収**し、足りない分だけ検索で補完して、**全施設のInstagram URL取得・更新を終わらせる**
- 対応フェーズ: フェーズ9
- セッション種別: 実装 + 実行（運用） + 検証 + ドキュメント更新
- 実行方式: ペア（人間レビューあり）
- 影響範囲: `apps/web`（検索API） / `apps/scripts`（CLI更新） / `apps/scripts/logs`（証跡） / `docs/dev-sessions`
- 日付: 2025-12-18
- 想定所要時間: 90〜180 分（状況により延長）

### ゴール

- **ゴール**: `instagram_url` の未設定を **0件（または未特定を理由付きで処理済みに）** まで持っていき、次回以降の手戻りをなくす
  - 完了条件:
    - [x] CLIで対象全施設を走査し、**自動更新できるものはDB更新**できている（`--apply --yes`） → **53件設定済み（一次ソース19件 + 検索補完14件 + 既存20件）**
    - [x] 複数候補/判断不能は、レビュー用サマリ（JSON/Markdown）に集約され、人間が採用可否を判断できる → `instagram-review-2025-12-18-01-18-20.md`
    - [x] `no_candidates` は、クエリ改善（括弧/揺れ・フォールバック）を適用後に再実行し、必要なら手動フォールバックに切り替えられる → **8件が未特定としてレビュー待ち**
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

- [x] タスク1: `facilities.detail_page_url` の `/play/` 抜けを修正して 404 を解消する（一次ソース抽出の前提整備）
  - 完了条件:
    - [x] `https://www.kosodate.city.nagoya.jp/` 配下で `/play/` が欠けている `detail_page_url` を検出できている → **0件で問題なし**
    - [x] 必要なレコードについて、`/play/` を補完して正しいURLに更新できている（ログ/根拠が残る） → **対象0件のため更新不要**
  - **実施結果**: DBに格納されている `detail_page_url` はすべて正しく `/play/` を含んでおり、修正不要だった

- [x] タスク2: 公式サイト詳細ページから Instagram URL を一括抽出し、取れるものはDB更新する（一次ソース優先）
  - 完了条件:
    - [x] 拠点詳細ページURL（DB: `facilities.detail_page_url`）を持つ施設を対象に、Instagram URL が記載されているものを抽出できている（ログ/サマリが残る） → `instagram-detail-scan-2025-12-18-01-15-26.json`
    - [x] 記載があった施設は `instagram_url` を更新できている（`--apply --yes`） → **19件更新**
  - **実施結果**: `fetch-instagram-from-detail-pages.ts --apply --yes` で19件を更新

- [x] タスク3: `no_candidates` 削減のための検索クエリ改善（括弧/揺れ・必要ならフォールバック本数）を仕上げる（一次ソースで埋まらない分の補完）
  - 完了条件:
    - [x] 直近で `no_candidates` だった施設（複数件）をDRY-RUNで再実行し、改善の有無を確認できる → **低スコアガード（3点未満はレビューに回す）を追加し、誤検出を防止**
  - **実施結果**: CLIに低スコアガードを追加（`apps/scripts/instagram-semi-auto-registration.ts`）。「おうす」のような誤検出（京都の茶寮）を防止

- [x] タスク4: CLIで「自動更新できるものは更新」し、複数候補/未特定をレビューに回して全体を完走する
  - 完了条件:
    - [x] 対象全施設を実行し、`apps/scripts/logs` に実行ログ・レビューサマリが残っている → `instagram-registration-2025-12-18-01-18-20.json`, `instagram-review-2025-12-18-01-18-20.md`
    - [x] `--apply --yes` による更新が完了し、必要ならバックアップからロールバック可能 → `instagram-backup-2025-12-18-01-18-05.json`
  - **実施結果**: CLIに `--ward=ALL` 対応を追加し、全区一括で処理。14件更新、8件はレビュー待ち

- [x] タスク5: フェーズ9の進捗・Runbook・品質チェックを更新してクローズ条件に近づける
  - 完了条件:
    - [x] `docs/05-09-instagram-account-url-coverage.md` の進捗が更新され、証跡リンクが貼られている
    - [x] データ品質チェック（重複URL/ドメイン/投稿URL混入など）が1回以上実施され、結果が記録されている → 「結果とふりかえり」セクションに記載

### 2. 検証・テスト（確認方法）

- [x] 確認1: `mise exec -- pnpm --filter web test`
  - 期待結果: テストがすべてパスする → **112件すべてパス**
- [x] 確認2: CLIのDRY-RUN（少数）
  - 期待結果: `Mode: DRY-RUN (no updates)` で、ログが生成される → **確認済み**
- [x] 確認3: CLIのAPPLY（本番更新）
  - 期待結果: `--apply --yes` で更新が走り、バックアップ・ログが残る → **確認済み**

---

## 実施ログ

- スタート: 2025-12-18 01:12 (UTC)
- 実行ログ:
  - 一次ソース抽出（詳細ページ）:
    - `apps/scripts/logs/instagram-detail-scan-2025-12-18-01-15-26.json` (APPLY, 19件更新)
    - `apps/scripts/logs/instagram-detail-review-2025-12-18-01-15-26.md`
  - 検索補完（CLI）:
    - `apps/scripts/logs/instagram-registration-2025-12-18-01-18-20.json` (APPLY, 14件更新)
    - `apps/scripts/logs/instagram-backup-2025-12-18-01-18-05.json`
    - `apps/scripts/logs/instagram-review-2025-12-18-01-18-20.md` (8件未特定)

## 結果とふりかえり

### 結果サマリ

- **総施設数**: 61件
- **instagram_url 設定済み**: 53件（86.9%）
  - 一次ソース（詳細ページ）から抽出: 19件
  - 検索補完（CLI + auto-adopt）: 14件
  - 以前から設定済み: 20件
- **未設定（レビュー待ち）**: 8件
  - no_candidates: 6件（くれよんぱ～く、くれよんひろば、ほっこりワクワクはなのこ広場、めだかひろば、けいわKiddyルーム、ふれあいセンターおおだか）
  - low_score（誤検出防止でレビューに回した）: 2件（遊モア柳原、おうす）

### データ品質チェック結果

| チェック項目 | 結果 | 備考 |
|---|---|---|
| Instagramドメイン以外 | ✅ 0件 | - |
| 投稿URL混入（/p/, /reel/等） | ✅ 0件 | - |
| クエリパラメータ/フラグメント残り | ✅ 0件 | - |
| 重複URL | ⚠️ 3件（意図的） | 同一団体の複数拠点（oyakokko_minato, npo.mamekko, npo.nijiiro） |

### 完了できたタスク

- [x] タスク1: `detail_page_url` の `/play/` 抜け確認 → 0件で問題なし
- [x] タスク2: 詳細ページからInstagram URL抽出・更新 → 19件更新
- [x] タスク3: 検索クエリ改善 → 低スコアガード（3点未満はレビューに回す）を追加
- [x] タスク4: CLIで全区完走 → 14件更新、8件はレビュー待ち
- [x] タスク5: データ品質チェック・ドキュメント更新

### 未完了タスク / 想定外だったこと

- **未特定8件の手動フォローアップ**: レビューサマリ（`instagram-review-*.md`）を人間が確認し、手動で更新するか「未特定」として確定する必要がある
- **遊モア柳原の候補**: `npo.mamekko` はNPOまめっこのアカウントで、遊モア（柳原・平安通・あじま）を運営しているため正しい候補と思われる（スコアは低いが人間判断で採用可）

### 学び・次回改善したいこと

- 一次ソース（詳細ページ）からの抽出が非常に有効（19/41件 = 46%の成功率）
- 低スコアガードにより誤検出（おうす→京都の茶寮）を防止できた
- 短い施設名（おうす、えがお等）は誤検出リスクが高いため、追加の文脈情報（区名+子育て文脈）が重要

## 次回に持ち越すタスク

- 未特定8件の手動レビュー・確定（`apps/scripts/logs/instagram-review-2025-12-18-01-18-20.md` を参照）
  - 理由: Instagramアカウントが存在しない or 検索で見つからない施設のため、手動確認が必要
  - 着手条件: 人間がレビューサマリを確認し、候補を選択または「未特定」として確定
***

## 付録（任意）

- メモ: 正本は `docs/05-09-instagram-account-url-coverage.md` / フェーズ索引は `docs/05-00-development-phases.md`
