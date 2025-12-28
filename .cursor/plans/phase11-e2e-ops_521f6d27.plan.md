---
name: phase11-e2e-ops
overview: フェーズ11の残タスク（Preview環境での代表フローE2E再実行、観点表への実行結果記録、運用ドキュメントの現状運用（Git-driven）への整合）を、Cloud Agent実行前提で具体手順に落とし込む。
todos:
  - id: pw-remote-config
    content: "`apps/web/playwright.config.ts` を、`BASE_URL` がリモート（Preview/Prod）のとき `webServer` を無効化する条件分岐に変更する"
    status: pending
  - id: run-e2e-preview
    content: Preview URL を `BASE_URL` に設定し、`CI=1` 付きで `mise exec -- pnpm --filter web e2e` を実行して report/trace を保存する
    status: pending
    dependencies:
      - pw-remote-config
  - id: stabilize-e2e-if-needed
    content: E2E失敗時に trace/report で原因を分類し、待機やセレクタ等を最小差分で安定化させて再実行で収束させる
    status: pending
    dependencies:
      - run-e2e-preview
  - id: update-representative-flow-doc
    content: "`docs/tests/representative-flow.md` に実行日・環境（Preview）・コマンド・結果（Pass/Fail）と補足を追記し、必要なら観点を追加する"
    status: pending
    dependencies:
      - run-e2e-preview
  - id: align-ops-docs
    content: "`docs/04-development.md` の7章/9章を Git-driven 運用（rollbackはrevert中心）に整合するよう差分確認し、必要なら更新する"
    status: pending
  - id: log-session-evidence
    content: "`docs/dev-sessions/2025/12/20251228-02-phase11-e2e-and-ops-alignment.md` のチェックリストと実施ログに証跡（結果/成果物パス/差分有無）を記録する"
    status: pending
    dependencies:
      - run-e2e-preview
      - align-ops-docs
      - update-representative-flow-doc
---

# フェーズ11: E2E再確認 & 運用整合（2025-12-28）具体Plan

## ゴール（このPlanで達成すること）

- Preview環境（Vercel Preview）に対して、代表フローE2E（Playwright）が再現性をもって実行でき、主要シナリオのPass/Failと証跡（レポート/トレース）が残る
- 実行結果を [`/home/junyatamaki/003-dev/childcare-schedule-hub/docs/tests/representative-flow.md`](/home/junyatamaki/003-dev/childcare-schedule-hub/docs/tests/representative-flow.md) に追記（環境・日付・結果・補足）
- `Git-driven（main merge→自動デプロイ、rollbackはrevert中心）` の現状運用に合わせて [`/home/junyatamaki/003-dev/childcare-schedule-hub/docs/04-development.md`](/home/junyatamaki/003-dev/childcare-schedule-hub/docs/04-development.md) の 7章/9章 を差分確認し、必要なら更新
- 証跡として、セッションファイル [`/home/junyatamaki/003-dev/childcare-schedule-hub/docs/dev-sessions/2025/12/20251228-02-phase11-e2e-and-ops-alignment.md`](/home/junyatamaki/003-dev/childcare-schedule-hub/docs/dev-sessions/2025/12/20251228-02-phase11-e2e-and-ops-alignment.md) のチェックリストと実施ログを更新

## 前提（今回固定）

- **E2Eターゲット**: Vercel Preview のみ
- **運用の正**: Git-driven（基本は `main` へのマージで自動デプロイ、ロールバックは `git revert`→再デプロイが中心。DB restore は原則しない/緊急時のみ別途手順）
- **秘匿情報**: Preview URL を含め、トークン/キー/本番URL等はドキュメントにベタ書きしない（必要なら伏せ字・一般化）

## 実行手順（Cloud Agent向けに、そのまま渡せる形）

### 0) 事前確認（最小）

- **Preview URL**（例: `https://<hash>-<project>.vercel.app`）を用意する
- `mise` と依存が揃っている前提で進める（不足なら `mise install` / `mise exec -- pnpm install`）

### 1) Playwright設定を「リモート実行」対応にする（必須）

現状の [`apps/web/playwright.config.ts`](/home/junyatamaki/003-dev/childcare-schedule-hub/apps/web/playwright.config.ts) は `webServer: { command: 'pnpm dev', url: 'http://localhost:3000' }` が常に有効なため、Previewに対して回したい場合でもローカルdev起動を試みます。

- **方針**: `BASE_URL` が `http://localhost:3000` のときだけ `webServer` を有効化し、それ以外（Preview/Prod）のときは `webServer` を無効化する
- **受け入れ条件**:
- ローカル向け: `BASE_URL` 未指定 → 従来どおり `pnpm dev` を起動して localhost に対してE2E
- Preview向け: `BASE_URL=https://...` 指定 → `pnpm dev` を起動せず、指定URLに対してE2E

### 2) Previewに対してE2Eを実行し、証跡を保存

対象テスト: [`apps/web/tests/e2e/favorites-flow.spec.ts`](/home/junyatamaki/003-dev/childcare-schedule-hub/apps/web/tests/e2e/favorites-flow.spec.ts)

- **実行コマンド（推奨）**: トレースを確実に取るため、`CI=1` で retries を有効化（configで `trace: on-first-retry` のため）
- `CI=1 BASE_URL=<PreviewURL> mise exec -- pnpm --filter web e2e`
- **成果物（保存/確認）**:
- Playwright HTML report（`apps/web/playwright-report/` もしくは既定の `playwright-report/`）
- 失敗時の trace（report から参照可能）

### 3) 失敗時の切り分けと最小安定化

失敗が出た場合、闇雲に待機を伸ばさず、原因別に最小差分で収束させる。

- **データ依存**（実データ差分で要素が存在しない/件数が足りない）:
- テスト前提を docs に明文化（例: 拠点データが最低N件ある、など）
- 可能ならテストを「前提を満たさない場合はskip」ではなく「安定して観測できる待機/セレクタ」に寄せる
- **UI待機不足**（SSR/ISR/ネットワークで表示が遅い）:
- `waitForLoadState('domcontentloaded')` だけで足りない箇所を、期待する要素の可視化待ちに変更
- **環境差**（Previewでのみ表示が異なる）:
- どの差分が原因かをスクショ/traceで確認し、テストの期待値を仕様に合わせる

### 4) 観点表（代表フロー）へ実行結果を記録

[`docs/tests/representative-flow.md`](/home/junyatamaki/003-dev/childcare-schedule-hub/docs/tests/representative-flow.md) に以下を追記:

- 実行日: 2025-12-28
- 実行環境: Vercel Preview（URLは伏せる）
- 実行コマンド: `CI=1 BASE_URL=<PreviewURL> mise exec -- pnpm --filter web e2e`
- 結果: Pass/Fail（Failなら failing Case ID と要約、対応内容）
- 実データで初めて見えた分岐があれば、観点表に追加（例: スケジュール未登録、埋め込み失敗フォールバック等）

### 5) 運用ドキュメントの整合（7章/9章）

対象: [`docs/04-development.md`](/home/junyatamaki/003-dev/childcare-schedule-hub/docs/04-development.md)

- **7章（デプロイと運用）**: 
- 期待する記述: `main` マージ → 自動デプロイ / Previewで事前確認 / 環境変数の扱い / ログ確認
- Git-drivenに合わせ、ダッシュボード操作中心の表現が強すぎる場合は「補助手段」として位置づける
- **9章（運用 Runbook）**:
- ロールバックを `git revert`→再デプロイ中心に整理
- `supabase db restore` は「原則しない/緊急時のみ、別手順・判断基準が必要」として扱いを明確化

### 6) セッションファイルに証跡を残す

[`docs/dev-sessions/2025/12/20251228-02-phase11-e2e-and-ops-alignment.md`](/home/junyatamaki/003-dev/childcare-schedule-hub/docs/dev-sessions/2025/12/20251228-02-phase11-e2e-and-ops-alignment.md)

- タスク1〜3のチェックを更新
- 実施ログに、実行日・環境（Preview）・結果・成果物パス（URLやシークレットは書かない）を記録

## 完了条件（チェック）

- `BASE_URL=https://<preview>` で `pnpm --filter web e2e` がローカルdev起動なしで実行できる
- 主要シナリオの結果（Pass/Fail）と証跡（report/trace）が残っている
- `representative-flow.md` に実行結果が追記されている