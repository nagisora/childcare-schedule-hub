# チェックリスト式実装計画書: 2025-12-14

> **重要（AI作業時）**: このファイルは `date +%Y%m%d` の結果（`20251214`）に基づいて作成している。  
> ルール: `docs/dev-sessions/README.md` / `docs/05-00-development-phases.md#dev-sessions-date`

## セッション概要とゴール

### 概要

- 一言サマリ: Instagram検索API/CLIに `strategy=score|rank` の切替を追加し、短い施設名での誤検出を減らす（rankは上位1〜3件を優先）
- 対応フェーズ: フェーズ9
- セッション種別: 実装
- 影響範囲: フェーズ9（InstagramアカウントURL検索・半自動登録フロー）
- 日付: 2025-12-14
- 想定所要時間: 60〜90 分

### ゴール

- **ゴール**: `/api/instagram-search` と半自動登録CLIで検索戦略を切り替えられ、`いずみ` のような短い施設名でも「上位（1〜3件）」ベースで候補提示できる状態にする
  - 完了条件:
    - `/api/instagram-search?facilityId=...&strategy=rank|score` が動作し、`rank` は「適切なクエリ→上位1〜3件」を返せる（プロフィールURLのみ）
    - CLIで `--strategy=score|rank` が使え、DRY-RUNで両戦略の比較ができる（比較出力が分かる）
    - シークレット（`GOOGLE_CSE_API_KEY` / `ADMIN_API_TOKEN` 等）がレスポンス/ログに出ない
  - 補足:
    - 「rankの順位定義」はクエリ単位で段階フォールバック（1本目→0件なら次…）を基本とし、クエリ横断の“混ぜた順位”はやらない（定義が曖昧になるため）

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9正本）
- 参照: `docs/dev-sessions/2025/12/20251213-02-phase9-instagram-search-api-semi-auto-registration.md`（現行PoCと改善要求）
- 参照: `docs/instagram-integration/03-design-decisions.md`（検索クエリ/判定ルール）
- 参照: `docs/04-development.md`（環境変数・CLI手順）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - Strategy A（score）は既存のスコアリングを維持（説明可能・理由を返せる）
  - Strategy B（rank）は「適切なクエリで検索→上位1〜3件」を優先し、scoreは“参考情報”として残す（足切りに使わない）
  - どちらの戦略でも、登録対象はプロフィールURLのみ（`/p/` `/reel/` 等は除外し、`https://www.instagram.com/<username>/` に正規化）
  - コスト抑制（共通）:
    - クエリ本数上限を設ける（短い施設名でも最大2〜3本）
    - 十分高信頼なら早期終了
    - （将来）facilityId+クエリ結果のキャッシュで再検索を避ける
- 議論概要:
  - 開発者の実感として「スコア方式は精度が微妙」なケースがあり、Google検索のランキング（上位1〜3件）を信用する戦略が有効そう
  - 例: `site:instagram.com いずみ 子育て 名古屋市 東区` で上位が正しい
- 保留中の論点 / 今回は触らないと決めたこと:
  - 大規模キャッシュ/日次上限制御の本格実装
  - Runbook整備とデータ品質チェック（フェーズ9タスク6）

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & プロンプト設計（実装・ドキュメント更新）

- [x] タスク1: `/api/instagram-search` に `strategy=score|rank` 切替を追加し、rank戦略を実装
  - 完了条件: `strategy=rank` で「クエリ段階フォールバック＋上位1〜3件（プロフィールURLのみ）」が返る。`strategy=score` は現行互換（スコア降順・スコア閾値は現行通り）。
  - **実行プロンプト案**:
    ```
    フェーズ9の改善として、Instagram検索APIに strategy 切替を追加してください。

    - 参照ファイル:
      - apps/web/app/api/instagram-search/route.ts
      - apps/web/lib/instagram-search.ts
      - docs/dev-sessions/2025/12/20251213-02-phase9-instagram-search-api-semi-auto-registration.md（次回持ち越し）
    - やりたいこと:
      - /api/instagram-search に query param `strategy=score|rank` を追加（デフォルト score）
      - score: 現行挙動を維持（スコア方式・閾値・既存レスポンス形式）
      - rank:
        - 適切なクエリ（短い施設名の例: site:instagram.com いずみ 子育て 名古屋市 東区）で検索
        - 1クエリにつき上位N件（N=10程度）を取得し、プロフィールURLへ正規化できるものだけ残す
        - そのクエリで得られた上位1〜3件を候補として返す（0件なら次クエリへ）
        - score は算出して candidates に含めてもよいが、rankの採用条件には使わない
      - triedQueries は返し続ける
    - 制約・注意点:
      - APIキーや管理トークンは絶対にログ/レスポンス/例外に出さない
      - rank の“順位”はクエリ横断で混ぜない（クエリ単位の段階フォールバック）
      - 既存テストを壊さない（必要なら追加・更新）
    ```

- [x] タスク2: 半自動登録CLIに `--strategy=score|rank` と比較モードを追加（安全装置も）
  - 完了条件: CLIで戦略を指定でき、DRY-RUNで両戦略の候補を比較表示できる。rank時の非対話自動採用は事故防止のため制御できる。
  - **実行プロンプト案**:
    ```
    apps/scripts/instagram-semi-auto-registration.ts を拡張して strategy 切替を追加してください。

    - 参照ファイル:
      - apps/scripts/instagram-semi-auto-registration.ts
      - apps/web/app/api/instagram-search/route.ts（strategy param）
      - docs/04-development.md（9.5.3節）
    - やりたいこと:
      - CLI引数に `--strategy=score|rank` を追加し、API呼び出しに strategy を渡す
      - （推奨）`--compare-strategies` を追加して、同一施設で score/rank の両方を呼び、差分が分かる形で表示する（DRY-RUN向け）
      - rank 戦略のとき、非対話環境（readline closed等）で「先頭候補の自動採用」をしない（危険なので）
    - 制約・注意点:
      - シークレットは表示・保存しない
      - 既存のデフォルト動作（DRY-RUN、--apply --yes の安全装置）は維持
    ```

- [x] タスク3: rank戦略のユニットテスト追加（最小）
  - 完了条件: `apps/web/__tests__/instagram-search.test.ts` に rank 向けの正規化・上位抽出ロジックのテストが追加され、既存テストも含めて通る。
  - **実行プロンプト案**:
    ```
    フェーズ9のInstagram検索ユーティリティに rank 戦略を追加したので、ユニットテストを追加してください。

    - 参照ファイル:
      - apps/web/lib/instagram-search.ts
      - apps/web/__tests__/instagram-search.test.ts
      - docs/tests/web-unit-test-perspectives.md（該当節があれば）
    - やりたいこと:
      - rank用の「上位からプロフィールURLのみ抽出」「クエリ内順位を保つ」等の分岐をテスト
      - 既存のスコア方式テストは維持
    - 制約・注意点:
      - テスト観点表（等価分割・境界値）を提示してから実装する
      - 例外/エラー系も含める
    ```

### 2. 検証・テスト（確認方法）

- [x] 確認1: ユニットテスト実行（web）
  - 期待結果: `apps/web/__tests__/instagram-search.test.ts` を含むテストが成功する
  - コマンド例: `mise exec -- pnpm --filter web test`

- [x] 確認2: ローカルでAPI手動確認（strategy切替）
  - 期待結果:
    - `strategy=score` で従来通り候補が返る（スコア/理由も含む）
    - `strategy=rank` で上位1〜3件が返る（プロフィールURLのみ、順位はCSEの順序を維持）
  - 手順例:
    - `mise exec -- pnpm --filter web dev`
    - ブラウザ or curl で `/api/instagram-search?facilityId=<id>&strategy=rank` を叩く（`x-admin-token` 必須）

- [x] 確認3: CLIでDRY-RUN比較（短い施設名を含むケース）
  - 期待結果:
    - `--strategy=rank` で「上位（1〜3件）」が提示される
    - `--compare-strategies` で score/rank の差が分かる
    - 非対話環境では rank の自動採用が走らず、安全側に倒れる
  - コマンド例:
    - `cd apps/scripts && pnpm tsx instagram-semi-auto-registration.ts --ward=東区 --compare-strategies`

---

## 実施ログ

- スタート: 2025-12-14
- メモ:
  - **タスク1（API strategy切替）実装完了**:
    - `apps/web/app/api/instagram-search/route.ts` に `strategy=score|rank` パラメータを追加
    - score戦略は既存処理を維持（互換性維持）
    - rank戦略を実装（クエリ単位の段階フォールバック、上位1〜3件）
  - **タスク2（共通ロジック）実装完了**:
    - `apps/web/lib/instagram-search.ts` に `processSearchResultsRank()` 関数を追加
    - 順位維持・プロフィールURLのみ抽出・重複URL排除を実装
  - **タスク3（CLI拡張）実装完了**:
    - `apps/scripts/instagram-semi-auto-registration.ts` に `--strategy=score|rank` を追加
    - `--compare-strategies` を追加（DRY-RUN専用、score/rankの比較表示）
    - rank戦略時の非対話自動採用を禁止（安全装置）
  - **タスク4（テスト）実装完了**:
    - `apps/web/__tests__/instagram-search.test.ts` に rank戦略のテストを追加（9ケース）
    - テスト観点表に基づき、等価分割・境界値・例外系をカバー
    - 既存テストも含めて全32件が通過
  - **タスク5（ドキュメント）実装完了**:
    - `docs/04-development.md` に新しいCLIオプションの使用方法を追記
  - **動作確認**:
    - ユニットテスト: 全32件通過（rank関連の新規テスト9件を含む）
    - 戦略比較モードで実測し、満足する精度が確認された 

## 結果とふりかえり

- 完了できたタスク:
  - [x] タスク1（API strategy切替）: `/api/instagram-search` に `strategy=score|rank` を追加し、rank戦略を実装。score戦略は既存処理を維持。
  - [x] タスク2（共通ロジック）: `processSearchResultsRank()` 関数を追加。順位維持・プロフィールURLのみ抽出・重複排除を実装。
  - [x] タスク3（CLI拡張）: `--strategy=score|rank` と `--compare-strategies` を追加。rank戦略時の非対話自動採用を禁止。
  - [x] タスク4（テスト）: rank戦略のユニットテストを追加（9ケース）。全32件が通過。
  - [x] タスク5（ドキュメント）: `docs/04-development.md` に新しいCLIオプションを追記。
- 未完了タスク / 想定外だったこと:
  - なし（すべてのタスクが完了）
- 学び・次回改善したいこと:
  - 戦略比較モード（`--compare-strategies`）で実測した結果、rank戦略が期待どおりの精度を発揮することが確認された
  - score戦略は既存のまま（変更なし）で、rank戦略が新規追加された
  - rank戦略は特に短い施設名（例: `いずみ`）での誤検出を減らすのに有効
  - クエリ単位の段階フォールバックが適切に動作し、Google検索のランキングを活用できている

## 次回に持ち越すタスク

- [ ] キャッシュ（facilityId+query+results）での再検索抑制
- [ ] Runbook整備とデータ品質チェック（フェーズ9タスク6）
- [ ] rank戦略のクエリ改善（`名古屋市` の扱い等）とログ/比較の磨き込み

***

## 付録（任意）

- 改善要求（要旨）: スコア算出の精度が微妙なケースがあり、Google検索のランキング（上位1〜3件）で正しい候補が出るため、ランキング方式も残しつつ切替可能にしたい  
  - 元記録: `docs/dev-sessions/2025/12/20251213-02-phase9-instagram-search-api-semi-auto-registration.md`

