# ドキュメント構成インデックス

本リポジトリの `docs/` 配下ドキュメントの役割・読了順・更新方針をまとめる。新規ドキュメント追加時は本ファイルを更新する。

## 1. 構成と役割
- 01 要件定義: `docs/01-requirements.md`
  - 目的: プロダクトの要求事項を単一ソースとして定義
  - 想定読者: プロダクトオーナー、開発/設計チーム
  - 更新のきっかけ: ビジネス要件変更、ロードマップ更新
- 00 開発セットアップ（mise 方針・導線）: 本ファイルおよび `docs/04-development.md`
  - 目的: 開発環境セットアップの入口。ランタイムは **mise** で管理（Node.js / pnpm など）
  - 使い方:
    1) `mise trust -y mise.toml`
    2) `mise install`
    3) パッケージが揃っている場合は `mise exec -- pnpm install`
  - 参照: `README.md` の「セットアップ」も併せて参照
- 02 設計資料: `docs/02-design.md`
  - 目的: システム構成、データモデル、UI/UX ガイドの提示
  - 想定読者: 設計/開発チーム
  - 更新のきっかけ: データモデル変更、UI/UX 更新、アーキ変更
- 03 API 仕様: `docs/03-api.md`
  - 目的: Supabase REST / Edge Functions など API レイヤの仕様化
  - 想定読者: FE/BE 開発、QA、運用
  - 更新のきっかけ: エンドポイント追加/変更、エラー仕様更新
- 04 開発ガイド: `docs/04-development.md`
  - 目的: セットアップ、運用、品質・テスト、デプロイ手順
  - 想定読者: 開発者、レビュアー、運用担当
  - 更新のきっかけ: 開発フロー/ツール更新、CI 設定変更
- 05 開発フェーズ: `docs/05-00-development-phases.md`
  - 目的: 少ない時間でも進めやすい高レベルなフェーズ設計
  - 想定読者: 開発者（タスクを分割して前進したい人）
  - 更新のきっかけ: フェーズ境界や完了条件の見直し
  - 運用ルール: [運用ルール（フェーズ × セッション）](./05-00-development-phases.md#運用ルールフェーズ--セッション) / [dev-sessions ファイルの日付の付け方](./05-00-development-phases.md#dev-sessions-ファイルの日付の付け方ai作業時の標準フロー)
  - フェーズ詳細テンプレ: [`docs/phase-planning/template-phase-detail.md`](./phase-planning/template-phase-detail.md)（フェーズ9以降の詳細計画を作成する際のテンプレート）
- 06 DB セットアップ & 手動オペレーション: `docs/06-db-operations.md`
  - 目的: **Supabase MCP を用いた AI 実行を基本とし**、必要に応じて人間が手動で実行するための Supabase データベースのセットアップ手順と運用手順
  - 想定読者: 開発者（特にフェーズ3のセットアップを行う人）
  - 更新のきっかけ: DB セットアップ手順の追加・変更、MCP 導入・利用方法の更新
- 開発セッション用ワークシート: `docs/dev-sessions/`
  - 目的: 1 回の作業（短時間）を計画→実施→記録するテンプレ置き場
  - テンプレ: `docs/dev-sessions/template-session.md`
  - 詳細: [`docs/dev-sessions/README.md`](./dev-sessions/README.md) を参照

推奨読了順: 01 → 02 → 03 → 04 → 05（必要に応じて `dev-sessions` を利用）
フェーズ3でDBセットアップを行う場合は、05 → 06 の順で参照してください。Cursor を利用している場合は、06 の Supabase MCP セクションを参照しつつ AI に実行させることを推奨します。

## 2. 命名規則と追加ポリシー
- ドキュメントファイル: `NN-title.md`
  - `NN` は 2 桁の連番（`00` はインデックス/メタ）
  - `title` は kebab-case。例: `05-00-development-phases.md`（`00` は全体概要用）
- 運用系フォルダ:
  - `dev-sessions/`: 日々の開発セッション（短時間作業）の記録置き場
    - 命名例: `YYYYMMDD-session-01.md`（1 日に複数回ある場合は連番）
    - テンプレからコピーして利用: `dev-sessions/template-session.md`
    - 詳細: [`docs/dev-sessions/README.md`](./dev-sessions/README.md) を参照
- 参照リンクは相互に付与し、初見でも辿れるようにする（01→02→03→04→05、04↔05、05↔dev-sessions）。

## 3. シナリオ別の参照ガイド

| やりたいこと | 見るドキュメント |
| --- | --- |
| MVP の全体像を知りたい | `01` 6.1〜6.2, 9, 12 |
| 代表フロー（拠点一覧→スケジュール→お気に入り）を理解したい | `01` 9.1 / `02` 4.1〜4.2 |
| DB テーブルや RLS を確認したい | `02` 3.1〜3.4 |
| API のパラメータやレスポンスを確認したい | `03` 2.2〜2.3 |
| 実装の方針・コーディングルールを知りたい | `04` 全般 |
| 今日の作業のゴールを決めたい | `05` / [`docs/dev-sessions/`](./dev-sessions/README.md) |
| フェーズ詳細計画を作成したい（フェーズ9以降） | [`docs/phase-planning/template-phase-detail.md`](./phase-planning/template-phase-detail.md) を参照 |
| **Supabase DB セットアップ（フェーズ3）を実行したい** | **`06` 2（MCP導入）→ 3（共通フロー）→ 4（初回セットアップ）** / `05` フェーズ3のチェックリスト<br>※ Cursor を使う場合は、06 の MCP セクション（2節）から始めて AI に実行させることを推奨 |
| Supabase MCP の導入手順を知りたい | `06` 2.1〜2.4 節 |
| Supabase CLI のコマンドを確認したい | `06` 5 節 |

## 4. 更新タイミングの目安
- 要件（01）: 機能要求・非機能要件・ロードマップが変わったタイミング
- 設計（02）: データモデル/構成/UX の変更時
- API（03）: エンドポイント/入出力/エラー仕様の変更時
- 開発ガイド（04）: 開発フロー、CI、品質・運用手順の更新時
- 開発フェーズ（05）: フェーズ定義や完了条件の学びが得られたとき
- フェーズ詳細計画（05-<phase>）: フェーズ9以降の詳細計画を作成・更新するとき（テンプレート: [`docs/phase-planning/template-phase-detail.md`](./phase-planning/template-phase-detail.md)）
- DB セットアップ & 手動オペレーション（06）: DB セットアップ手順の追加・変更時、MCP 導入・利用方法の更新時
- セッション記録（dev-sessions）: 各作業の度に追記（小さく早く回す）

## 5. 運用ルール（要点）
- 新しい開発タスクを始める前に、どのフェーズ（05）に属するか決める。
- 1 セッションを始めるときは [`docs/dev-sessions/template-session.md`](./dev-sessions/template-session.md) をコピーし、当日のゴールと結果を残す。
- フェーズ完了時は関連ドキュメント（01〜04）を必要最小限で更新し、相互リンクを保つ。
