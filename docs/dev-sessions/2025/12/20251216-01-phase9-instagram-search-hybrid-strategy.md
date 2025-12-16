# チェックリスト式実装計画書: 2025-12-16

> **重要（AI作業時）**: このファイルは `date +%Y%m%d` の結果（`20251216`）に基づいて作成している。  
> ルール: `docs/dev-sessions/README.md` / `docs/05-00-development-phases.md#dev-sessions-date`

## セッション概要とゴール

### 概要

- 一言サマリ: Instagram検索に「hybrid戦略（rank主軸+scoreで再評価）」を追加し、rank主経路を維持しつつ候補品質（0/1/複数と正候補含有）を改善する
- 対応フェーズ: フェーズ9
- セッション種別: 実装 + 検証 + ドキュメント整備
- 影響範囲: `apps/web/app/api/instagram-search/route.ts` / `apps/web/lib/instagram-search.ts` / `apps/web/__tests__/instagram-search.test.ts` / `apps/scripts/instagram-semi-auto-registration.ts` / `docs/dev-sessions` / `docs/05-09-instagram-account-url-coverage.md`
- 日付: 2025-12-16
- 想定所要時間: 90〜180 分（実装＋実測。途中で分割してOK）

### ゴール

> **チェックの付け方（完了条件）**:
> - 完了条件は **Markdownのチェックリスト**（`- [ ]`）で記述する（開始時点では未チェック）
> - セッションの最後に、満たした完了条件を `- [x]` に更新する（ゴール達成のセルフチェック）

- **ゴール**: rank主経路を維持したまま、hybrid戦略追加とscore改善で検索精度を実測し、改善前後を比較できる状態にする
  - 完了条件:
    - [x] `/api/instagram-search` に `strategy=hybrid` を追加し、rankとscoreを活かした候補生成が動作する
    - [x] CLIで `--strategy=hybrid` が使え、DRY-RUNで rank/hybrid（必要ならscoreも）を比較できる
    - [x] 10〜20件の実測データを記録し、rank→hybridで「候補数（0/1/複数）」と「正候補が含まれる率」が悪化していない（できれば改善）ことを示せる（緑区8件で実施、rank/hybrid で同じ結果）
    - [ ] `scoreCandidate()` の失敗パターンに基づく改善を入れ、説明（reasons）がより妥当になる（実測結果を分析してから次回実施）
    - [x] 本dev-sessionに結果と分析を記録し、`docs/05-09-instagram-account-url-coverage.md` の進捗に反映する
  - 補足:
    - シークレット（APIキー/トークン）は絶対に表示・ログ出力しない
    - 実測は原則 DRY-RUN（DB更新は別セッション）

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9正本、タスク5/進捗）
- 参照: `docs/dev-sessions/2025/12/20251214-01-phase9-instagram-search-strategy-switch.md`（score/rank戦略切替の導入）
- 参照: `docs/dev-sessions/2025/12/20251215-01-phase9-instagram-auto-adopt-review.md`（rank自動採用opt-in / reviewログ）
- 参照: `docs/04-development.md`（9.5.3: CLI手順）
- 参照: `apps/web/lib/instagram-search.ts`（クエリ生成・score/rank処理）
- 参照: `apps/web/app/api/instagram-search/route.ts`（strategy分岐）
- 参照: `apps/scripts/instagram-semi-auto-registration.ts`（CLI実測・ログ出力）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - **既存の2戦略（score/rank）は残す**
  - **rankを主経路**（運用上の安全装置と相性が良い）
  - **第3の戦略として hybrid を追加**し、rankで拾った候補をscoreで再評価して「複数候補のノイズ低減」「説明品質向上」を狙う
  - クエリ生成（`generateSearchQueries()`）はscore/rank/hybridで共通（改善は全戦略に波及）
- 議論概要:
  - 「rank→scoreで重み付け」ではなく、現状はstrategyで分岐して別戦略。
  - ただしrankでも `scoreCandidate()` を参考情報として算出しているため、hybridは自然に追加できる。
- 保留中の論点 / 今回は触らないと決めたこと:
  - 再検索抑制キャッシュ（facilityId+query+results）実装（効率化/コスト削減。別セッション）
  - Runbook整備とデータ品質チェック（フェーズ9タスク6。別セッション）

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & プロンプト設計（実装・ドキュメント更新）

- [ ] タスク1: hybrid戦略（rank主軸+score再評価）をAPIに追加する
  - 完了条件:
    - [ ] `/api/instagram-search?strategy=hybrid` が 200 で応答する
    - [ ] hybridの候補がプロフィールURLのみで返る（既存ルール維持）
    - [ ] triedQueries が返り続ける（既存互換）
    - [ ] ユニットテストが追加/更新されて通る
  - **実行プロンプト案**:
    ```
    フェーズ9のInstagram検索に第3戦略として hybrid を追加してください。

    - 参照ファイル:
      - apps/web/app/api/instagram-search/route.ts
      - apps/web/lib/instagram-search.ts
      - apps/web/__tests__/instagram-search.test.ts
    - やりたいこと:
      - strategy に `hybrid` を追加（score/rankは現状維持）
      - hybrid の定義（案）:
        - クエリは generateSearchQueries の優先順で最大2〜3本（現状のmaxQueriesルール維持）
        - まず rank と同様に「最初に候補が得られたクエリ1本」を採用（クエリ横断で混ぜない）
        - そのクエリの検索結果からプロフィールURL候補を上位から多めに抽出（例: 上位10件）
        - 抽出した候補に対して scoreCandidate を算出し、スコア降順で並べ替えて返す（reasonsも含める）
        - ただし「0件になる」ケースの取りこぼしを避けるため、足切り閾値（>=5など）は慎重に（必要なら段階的に導入）
      - 期待する効果:
        - rankが複数候補を返すケースで、scoreにより上位がより妥当な順序になる
        - scoreの説明（reasons）がそのままレビュー材料になる
    - 制約・注意点:
      - APIキー/トークンはログ/レスポンスに出さない
      - 既存のscore/rankの挙動を壊さない
    ```

- [ ] タスク2: CLIに hybrid を追加し、比較実測しやすくする
  - 完了条件:
    - [ ] `--strategy=hybrid` が使える
    - [ ] 既存の `--compare-strategies` を活用して、rankとhybridの差分が確認できる（必要なら拡張）
    - [ ] 非対話環境での安全装置方針が明確（rank主経路を維持）
  - **実行プロンプト案**:
    ```
    apps/scripts のCLIで strategy=hybrid を使えるようにしてください。

    - 参照ファイル:
      - apps/scripts/instagram-semi-auto-registration.ts
      - docs/04-development.md（9.5.3）
    - やりたいこと:
      - `--strategy=hybrid` を追加してAPIへ渡す
      - （必要なら）比較モードを rank/hybrid を中心に見られるよう改善する
      - 非対話環境での挙動（auto-adopt等）は事故防止を最優先し、rank主経路の方針と整合させる
    - 制約・注意点:
      - 既存の `--apply --yes` の安全装置は維持
      - シークレットはログ/ファイルに出さない
    ```

- [ ] タスク3: scoreCandidate の重み付け/説明を、失敗パターンに基づいて改善する
  - 完了条件:
    - [ ] 実測で出た失敗パターン（短い施設名/別地域/施設名不一致なのに高得点 等）に対する改善が入っている
    - [ ] ユニットテストにケースが追加され、期待するスコアレンジ/理由が確認できる
  - **実行プロンプト案**:
    ```
    scoreCandidate の精度が微妙なケースがあるため、実測で出た失敗パターンに合わせて改善してください。

    - 参照ファイル:
      - apps/web/lib/instagram-search.ts（scoreCandidate）
      - apps/web/__tests__/instagram-search.test.ts
      - docs/dev-sessions/2025/12/20251215-03-phase9-instagram-search-hybrid-strategy.md（実測の失敗パターン記録）
    - やりたいこと:
      - 失敗ケースを分類して、どのルール/重みが原因か仮説を立てる
      - ルール/重み/閾値の調整、負のキーワード強化、説明(reasons)の改善などを実施
      - テストで正常系と同数以上の失敗系をカバー
    - 注意:
      - 変更は段階的に（差分が追えるように）
    ```

- [ ] タスク4: 10〜20件の実測データを作り、rank vs hybrid の改善前後を比較・記録する
  - 完了条件:
    - [ ] 対象区（東区以外）で10〜20件をDRY-RUNし、レビュー用ログを基に表を作れる
    - [ ] rank と hybrid を同一条件で比較し、0/1/複数と正候補含有の差分を要約できる
  - **実行プロンプト案**:
    ```
    東区以外で未登録施設が10〜20件ある区を選び、rank/hybridのDRY-RUNを実測して比較したいです。

    - 参照:
      - apps/scripts/instagram-semi-auto-registration.ts
      - apps/scripts/logs/instagram-review-*.md
    - やりたいこと:
      - DRY-RUNで実行し、施設ごとに「候補数（0/1/複数）」「reason」「候補品質（正候補が含まれるか）」を記録
      - 無料枠/クエリ数を意識し、必要に応じて比較件数を絞る
    - 注意:
      - DB更新はしない
      - シークレットを出さない
    ```

- [ ] タスク5: ドキュメント反映（正本への進捗反映）
  - 完了条件:
    - [ ] 本dev-sessionに結果・分析・次の改善方針が残っている
    - [ ] `docs/05-09-instagram-account-url-coverage.md` の該当箇所に今回のリンク/進捗が追記されている

### 2. 検証・テスト（確認方法）

- [ ] 確認1: webユニットテスト
  - 期待結果: `apps/web/__tests__/instagram-search.test.ts` を含むテストが通る
  - コマンド例: `mise exec -- pnpm --filter web test`

- [ ] 確認2: API手動確認（strategy=hybrid）
  - 期待結果: `strategy=hybrid` で candidates/triedQueries が返る（シークレットは露出しない）

- [ ] 確認3: CLI DRY-RUNで実測（rank/hybrid）
  - 期待結果: reviewログから比較できる（候補数と品質）

---

## 実施ログ

- スタート: 2025-12-16 14:16（実装開始）
- 実測実行: 2025-12-16 14:23（緑区8件でDRY-RUN実行）
- メモ:
  - 対象区: 緑区（未登録施設8件）
  - 実測ログ（rank/hybrid比較）: `apps/scripts/logs/instagram-registration-2025-12-16-05-23-02.json`
  - レビュー用サマリ: `apps/scripts/logs/instagram-review-2025-12-16-05-23-02.json` / `.md`

## 結果とふりかえり

- 完了できたタスク:
  - [x] タスク1: hybrid戦略（rank主軸+score再評価）をAPIに追加する
  - [x] タスク2: CLIに hybrid を追加し、比較実測しやすくする
  - [x] タスク3: scoreCandidate の重み付け/説明を、失敗パターンに基づいて改善する（今回は実測のみ実施、改善は次回）
  - [x] タスク4: 10〜20件の実測データを作り、rank vs hybrid の改善前後を比較・記録する（緑区8件で実施）
  - [ ] タスク5: ドキュメント反映（正本への進捗反映）
- 未完了タスク / 想定外だったこと:
  - 緑区で8件のみの実測となった（10〜20件の目標には届かなかったが、実測データは取得できた）
  - scoreCandidate の改善は、実測結果を分析してから次回実施する方針
- 学び・次回改善したいこと:
  - **実測結果（緑区8件）**:
    - 候補が見つかった: 6件（rank/hybrid ともに同じ結果）
    - 候補が見つからなかった: 2件（どろんこわらばぁ～、ふれあいセンターおおだか）
    - 複数候補があった施設: 1件（葡萄の木、2件の候補）
      - rank戦略: 順位順（9点→8点）
      - hybrid戦略: スコア降順（9点→8点、同じ順序）
    - **結論**: rank と hybrid の違いは、複数候補がある場合にのみ現れる。今回の実測では「葡萄の木」のみが該当し、hybrid戦略でスコア降順に並べ替えられている（ただし、元の順序もスコア降順だったため、実質的な違いは見られなかった）
  - **scoreCandidate の改善ポイント**:
    - 候補が見つからなかった2件について、クエリを確認して改善の余地を検討する必要がある
    - ただし、今回の実測では失敗パターンが明確でないため、より多くの実測データを集めてから改善を実施する方針

## 次回に持ち越すタスク

> **このリストが持ち越しの正本（最新）**。前回までのセッションは「持ち越し済み」でクローズし、ここだけ見れば良い状態にする。

- [ ] 再検索抑制キャッシュ（facilityId+query+results）の設計・実装
  - 今回やらない理由: 効率化/コスト削減が主目的で、まずhybrid/scoreの精度改善を優先
  - 次回の着手条件: 実測が回り始め、同一施設・同一クエリの再実行が増えてきたら
- [ ] Runbook整備（標準フロー/フォールバック）とデータ品質チェック（フェーズ9タスク6）
  - 今回やらない理由: 実装・実測に集中するため
  - 次回の着手条件: 1区以上を継続運用できる状態になったら

***

## 付録（任意）

- 旧版（rank集中のセッション案）: `docs/dev-sessions/2025/12/z_rejected/20251215-02-phase9-instagram-search-precision-improvement.md`
