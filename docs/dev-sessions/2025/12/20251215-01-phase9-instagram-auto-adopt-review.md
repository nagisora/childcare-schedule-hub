# チェックリスト式実装計画書: 2025-12-14

> **重要（AI作業時）**: このファイルは `date +%Y%m%d` の結果（`20251215`）に基づいて作成している。  
> ルール: `docs/dev-sessions/README.md` / `docs/05-00-development-phases.md#dev-sessions-date`

## セッション概要とゴール

### 概要

- 一言サマリ: フェーズ9のInstagram URL登録CLIに「rankでも非対話環境で自動採用できるモード（B案）」を追加し、迷った施設は未特定としてログに残して後で人間が判断できるようにする
- 対応フェーズ: フェーズ9
- セッション種別: 実装 + 運用整備
- 影響範囲: フェーズ9（InstagramアカウントURL全面カバー）/ `apps/scripts` / `docs/04-development.md` / `docs/05-09-instagram-account-url-coverage.md`
- 日付: 2025-12-15
- 想定所要時間: 90〜150 分（重いので途中で分割してOK）

### ゴール

- **ゴール**: Cursor Agent（非対話環境）でも、明示的に許可した場合のみ `--strategy=rank` の自動採用で `facilities.instagram_url` を更新でき、迷ったものは「未特定」としてログに残って人間が後で判断できる
  - 完了条件:
    - `apps/scripts/instagram-semi-auto-registration.ts` に **自動採用許可オプション**が追加される（デフォルトは現状どおり安全側）
    - 非対話環境で `--strategy=rank` のとき、**許可がない場合は従来どおりスキップ**、許可がある場合は **安全判定に通るものだけ自動採用**、迷うものは **未特定（not_found）** として記録される
    - 「未特定（迷った）」の施設が、結果JSONから **抽出しやすい形（reasonが機械可読）**で残る（可能なら review用の別ファイルも出力）
    - `docs/04-development.md`（9.5.3）と `docs/05-09-instagram-account-url-coverage.md`（タスク5の説明）に新オプションと運用ルールが追記されている
    - 東区（3施設）の更新を **この自動モードで完結**できる（= DBが更新され、未特定が出た場合もログから判断できる）

### 関連ドキュメント

- 参照: `docs/05-09-instagram-account-url-coverage.md`（フェーズ9正本）
- 参照: `docs/04-development.md`（9.5.3: CLI手順）
- 参照: `docs/dev-sessions/2025/12/20251214-02-phase9-instagram-apply-quality-check.md`（rankが非対話でスキップされる事象と証跡）
- 参照: `docs/20-deferred-work.md`（後回し作業リスト、例: DW-001）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - デフォルトは「半自動」のまま（人間が選ぶ/非対話では危険側に倒す）を維持する
  - **明示的に opt-in した場合のみ**「自動採用」を許可する（事故防止）
  - 「迷ったら未特定」は必ずログに残し、人間が後日判断できるようにする（= 黒箱にしない）
  - MVP優先: 例外管理（複数拠点でアカウント共有等）は **まず許容し、後回し作業として追跡**する（必要なら `docs/20-deferred-work.md` + GitHub Issue）
- 議論概要:
  - rank戦略は候補精度が良いが、非対話環境では安全装置でスキップされてDB更新できない
  - 方針転換: 「自動採用を許可する設計（B案）」を入れつつ、迷ったものは未特定として記録する
- 保留中の論点 / 今回は触らないと決めたこと:
  - 全国展開に向けた「共有アカウント例外」の本格的な仕様策定（MVP後に検討）

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & プロンプト設計（実装・ドキュメント更新）

- [x] タスク1: CLIに「rank非対話での自動採用許可（B案）」と「迷ったら未特定ログ」を実装する - 2025-12-15
  - 完了条件:
    - [x] `--strategy=rank` かつ 非対話環境でも、**明示的なフラグ指定がある場合のみ**自動採用できる
    - [x] 自動採用できない（= 迷う）ケースは `action: not_found` で記録され、`reason` が機械可読（例: `auto_adopt_blocked_multiple_candidates` 等）
    - [x] 結果JSON（`apps/scripts/logs/instagram-registration-<timestamp>.json`）から、未特定リストが抽出できる
    - [x] レビュー用サマリファイル（`instagram-review-<timestamp>.json`）を追加し、`action: not_found` のみを抽出できる
  - **実行プロンプト案**:
    ```
    フェーズ9の半自動登録CLIを、Cursor Agent（非対話環境）でも安全にDB更新できるよう拡張してください。

    - 参照ファイル:
      - apps/scripts/instagram-semi-auto-registration.ts
      - docs/04-development.md（9.5.3）
      - docs/05-09-instagram-account-url-coverage.md（タスク5）
      - docs/dev-sessions/2025/12/20251214-02-phase9-instagram-apply-quality-check.md（rankが非対話でスキップされる現象）
    - やりたいこと:
      - `--auto-adopt`（または同等の明示フラグ）を追加し、非対話環境でもrank戦略の自動採用を「許可」できるようにする（デフォルトは現状どおり禁止）
      - ただし自動採用は安全側に倒す。最低限:
        - 候補が0件: not_found
        - 候補が1件: adopt（--auto-adopt指定時のみ）
        - 候補が2件以上: not_found（迷った扱い）として記録し、人間が後で判断できるように candidates と reason を残す
      - not_found の reason を機械可読にする（例: auto_adopt_blocked_multiple_candidates / auto_adopt_disabled / no_candidates）
      - 既存の結果JSON（registration）とバックアップJSONの出力は維持しつつ、必要なら「レビュー用の要約ファイル」（例: `instagram-review-<timestamp>.md` or `.csv`）も追加する
    - 制約・注意点:
      - --apply は必ず --yes とセット（現状維持）
      - シークレットはログ/ファイルに出さない
      - 既存の対話実行のUXは壊さない
    ```

- [x] タスク2: 運用ドキュメントを更新する（「半自動」→「自動採用オプション付き」に） - 2025-12-15
  - 完了条件:
    - [x] `docs/04-development.md` 9.5.3 に `--auto-adopt` の使い方と注意（事故防止・未特定の扱い）が追記されている
    - [x] `docs/05-09-instagram-account-url-coverage.md` タスク5の説明が「半自動（デフォルト） + 自動採用（opt-in）」として整合している
  - **実行プロンプト案**:
    ```
    フェーズ9のInstagram URL登録CLIに自動採用オプションを追加したので、運用ドキュメントも整合するよう更新してください。

    - 対象ファイル:
      - docs/04-development.md（9.5.3）
      - docs/05-09-instagram-account-url-coverage.md（タスク5）
    - やりたいこと:
      - デフォルトは半自動（人間が選ぶ）であること
      - 非対話環境では `--auto-adopt` を付けた場合のみ自動採用が動くこと
      - 「迷ったら未特定」は結果JSON（必要なら reviewファイル）に残り、人間が後で判断できること
      - 例として東区（3件）での実行例コマンドを載せる
    - 注意:
      - APIキー等のシークレットは書かない
    ```

- [ ] タスク3: 東区（3施設）をこの仕組みで「処理済み」にして証跡を残す
  - 完了条件:
    - `--strategy=rank --auto-adopt --apply --yes --ward=東区` でDB更新が行われる（少なくとも候補1件の施設は更新）
    - 迷ったものがあれば not_found としてログに残り、人間が後で判断できる
    - 更新後SQLで東区の `instagram_url IS NULL` が減っている
  - **状態**: 実装は完了したが、実際の実行・検証は未実施（次回セッションで実施予定）
  - **実行プロンプト案**:
    ```
    自動採用オプションを実装したので、東区（3施設）を対象に apply を実行してDB更新まで完結させたいです。

    - 手順:
      - web dev server起動: mise exec -- pnpm --filter web dev
      - DRY-RUNで結果確認: cd apps/scripts && pnpm tsx instagram-semi-auto-registration.ts --ward=東区 --strategy=rank --auto-adopt
      - apply実行: cd apps/scripts && pnpm tsx instagram-semi-auto-registration.ts --ward=東区 --strategy=rank --auto-adopt --apply --yes
      - SQLで更新結果確認（東区のinstagram_url一覧とNULL件数）
      - 結果JSON/バックアップJSON（必要なら reviewファイル）名を dev-session に記録
    - 注意:
      - シークレットを出さない
      - 迷うものは not_found として残す（無理に埋めない）
    ```

### 2. 検証・テスト（確認方法）

- [ ] 確認1: `--auto-adopt` 未指定で rank を非対話実行した場合、従来どおりスキップされる
      - 期待結果: DB更新されず、結果JSONに `action: skipped`, `reason: auto_adopt_disabled` が残る（安全装置）
      - **状態**: 実装完了、実際の実行は未実施
- [ ] 確認2: `--auto-adopt` 指定で rank を非対話実行した場合、候補1件の施設は自動採用される
      - 期待結果: apply時に `facilities.instagram_url` が更新され、結果JSONに `action: adopted`, `reason: auto_adopt_single_candidate` が残る
      - **状態**: 実装完了、実際の実行は未実施
- [ ] 確認3: 候補が複数のケースは「未特定」として残る
      - 期待結果: `action: not_found` になり、`reason` が `auto_adopt_blocked_multiple_candidates` で機械可読、`candidates` 配列も記録される
      - **状態**: 実装完了、実際の実行は未実施
- [ ] 確認4: 結果ファイルで「未特定一覧」が人間に読める
      - 期待結果: 結果JSON（`instagram-registration-*.json`）とレビュー用サマリ（`instagram-review-*.json`）から、施設名/ID/候補/理由が追える
      - **状態**: 実装完了（`writeReviewSummary()` 関数を追加）、実際の実行は未実施

---

## 実施ログ

- スタート: 2025-12-15（実装完了）
- メモ:
  - 実装完了: `apps/scripts/instagram-semi-auto-registration.ts` に `--auto-adopt` フラグを追加
  - 選択ロジックを純粋関数 `decideAction()` に分離し、reasonコードを統一（`user_skipped`, `auto_adopt_single_candidate`, `auto_adopt_blocked_multiple_candidates` など）
  - 非対話環境での `strategy=rank` の挙動をB案に更新（`--auto-adopt` opt-in で自動採用、複数候補は `not_found` で記録）
  - レビュー用サマリ出力機能（`writeReviewSummary()`）を追加し、`action: not_found` のみを抽出した `instagram-review-*.json` を出力
  - ドキュメント更新: `docs/04-development.md` 9.5.3 と `docs/05-09-instagram-account-url-coverage.md` タスク5を新仕様に整合
  - 実装されたreasonコード一覧:
    - `no_candidates`: 候補が0件
    - `user_skipped`: ユーザーがスキップを選択
    - `user_marked_not_found`: ユーザーが未特定としてマーク
    - `user_selected`: ユーザーが候補番号を選択
    - `invalid_input`: 無効な入力
    - `auto_adopt_disabled`: `--auto-adopt` 未指定で非対話環境（安全装置）
    - `auto_adopt_single_candidate`: `--auto-adopt` 指定時、候補1件で自動採用
    - `auto_adopt_blocked_multiple_candidates`: `--auto-adopt` 指定時、候補2件以上で未特定として記録
    - `non_interactive_score_strategy`: 非対話環境での score 戦略（従来通り）
    - `error_api_failed`: API呼び出し失敗

## 結果とふりかえり

- 完了できたタスク:
  - [x] タスク1（自動採用opt-in + 未特定ログ）: 実装完了
    - `--auto-adopt` フラグを追加し、非対話環境での rank 戦略の自動採用を opt-in で許可
    - 選択ロジックを `decideAction()` 純粋関数に分離し、reasonコードを機械可読に統一
    - レビュー用サマリ出力機能（`instagram-review-*.json`）を追加
  - [x] タスク2（docs整合）: 実装完了
    - `docs/04-development.md` 9.5.3 に `--auto-adopt` の説明、挙動、注意事項を追記
    - `docs/05-09-instagram-account-url-coverage.md` タスク5を新仕様に整合
  - [ ] タスク3（東区 apply 完結）: 実装は完了したが、実際の実行・検証は未実施
- 未完了タスク / 想定外だったこと:
  - タスク3の実際の実行・検証は次回セッションで実施予定（実装は完了しているため、実行環境で検証が必要）
- 学び・次回改善したいこと:
  - 選択ロジックを純粋関数に分離したことで、テストしやすくなり、reasonコードの一貫性も保たれた
  - `--auto-adopt` は opt-in で安全装置を維持しつつ、非対話環境でのDB更新を可能にした
  - 複数候補のケースは `not_found` として記録することで、誤登録を防ぎつつ人間が後で判断できる設計に
  - レビュー用サマリファイルを追加することで、未特定施設の抽出・レビューが容易になった

## 次回に持ち越すタスク

> **このリストが持ち越しの正本（最新）**。前回までのセッションは「持ち越し済み」でクローズし、ここだけ見れば良い状態にする。
> もし過去に「漏れていたタスク」に気づいた場合は、ここ（最新）にだけ追記し、行末に `（漏れていたため追加: YYYY-MM-DD）` を付ける。

- [ ] タスク3: 東区（3施設）をこの仕組みで「処理済み」にして証跡を残す（実装完了、実行・検証は次回実施）
  - 手順:
    1. web dev server起動: `mise exec -- pnpm --filter web dev`
    2. DRY-RUNで結果確認: `cd apps/scripts && pnpm tsx instagram-semi-auto-registration.ts --ward=東区 --strategy=rank --auto-adopt`
    3. apply実行: `cd apps/scripts && pnpm tsx instagram-semi-auto-registration.ts --ward=東区 --strategy=rank --auto-adopt --apply --yes`
    4. SQLで更新結果確認（東区の `instagram_url IS NULL` 件数、一覧）
    5. 結果JSON（`instagram-registration-*.json`）とレビュー用サマリ（`instagram-review-*.json`）を確認し、ファイル名を dev-session に記録

### 繰り越し（20251214-02 からの持ち越し）

- [ ] 検索精度の実測を 10〜20件に拡大し、成功/失敗パターンを記録（短い施設名ケースを含める）
- [ ] キャッシュ（facilityId+query+results）での再検索抑制
- [ ] Runbook整備（標準フロー: 検索API/CLI、フォールバック: ブラウザ手動）と、未特定の記録方法の統一（フェーズ9タスク6）
- [ ] rank戦略のクエリ改善（`名古屋市` の扱い等）とログ/比較の磨き込み

***

## 付録（任意）

- A案 / B案（用語の定義と判断理由）
  - **A案: 半自動のまま運用（現状維持）**
    - 人間が候補を見て「採用/スキップ/未特定」を選ぶ
    - 非対話環境では安全装置が働き、特に `--strategy=rank` は自動採用せずスキップ（DB更新しない）
  - **B案: 自動採用を許可する設計（opt-in）を追加**
    - デフォルトはA案（安全側）を維持しつつ、明示フラグ（例: `--auto-adopt`）がある場合のみ、非対話環境でも自動採用してDB更新できる
    - ただし「迷ったら未特定」に倒し、**未特定の理由と候補をログに残す**（後で人間が判断できるようにする）
  - **B案に至った判断理由**
    - `20251214-02` で、rank戦略の候補精度は良好だが **非対話環境では自動採用禁止のためDB更新が進まない**ことが判明
    - MVPを速く進めるには「Cursor Agentに任せてDB更新まで完結」させたい
    - ただし誤登録リスクは残るため、**opt-in** と **迷ったら未特定（ログでレビュー可能）** をセットにするのがバランスが良い

- 参考: 現状のrank戦略は非対話環境で自動採用を禁止している（安全装置）
  - 対象: `apps/scripts/instagram-semi-auto-registration.ts` の `readline closed` ハンドリング
