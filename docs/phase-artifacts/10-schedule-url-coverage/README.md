# フェーズ10: スケジュールURLの全面カバー - 添付資料

このディレクトリは、フェーズ10の**添付資料（成果物・実行結果・サンプル出力）**を格納する場所です。

## 役割と位置づけ

- **正本（進捗管理）**: [`docs/05-10-schedule-url-coverage.md`](../../05-10-schedule-url-coverage.md)
- **作業ログ**: [`docs/dev-sessions/`](../../dev-sessions/)
- **添付資料（本ディレクトリ）**: 実行結果のJSON/Markdown/CSV、理由コード定義、SQLクエリなど

## ディレクトリ構成

- `README.md`（本ファイル）: このフォルダの目的・最新のrunへのリンク
- `reason-codes.md`: 理由コードの正本（`05-10` から参照リンク）
- `task-01-spec.md`: タスク1で決めた仕様（対象月/分類/出力スキーマ）
- `runs/YYYYMMDD/`: 実行結果の置き場（JSON/Markdown/CSV）
- `sql/`: 品質チェックSQL（必要に応じて）

## 運用ルール

- **正本の優先順位**: 進捗と計画＝`05-10`、日々のログ＝`dev-sessions`、出力物＝`phase-artifacts`
- **リンクの貼り方**: `dev-sessions` には出力を貼り付けず、**`phase-artifacts` への相対リンク**で参照（ログ肥大化を防ぐ）
- **巨大JSON問題**: 出力が大きくなる場合は、`runs/` には「要約（Markdown + 件数）」だけコミット、フルデータは別管理

## 重要な合意（実装/運用で迷いやすいポイント）

- **推奨調査順（手動レビュー前提）**: **ピン留め（固定投稿）→ハイライト→Google CSE**
  - 固定/ハイライトであっても「固定だから」「ハイライトにあるから」という理由だけで採用しない。**対象月の月間スケジュール**だと根拠が取れる場合のみ採用する
- **推奨調査順（MVPの自動処理/CLI前提）**: Instagramの自動巡回は避けるため **Google CSE →（判断不能なら）未特定に倒す** を基本にする
  - ハイライトのみ等が「根拠として取れる」場合に限り、対象外（例: `S10_OUT_OF_SCOPE_STORY_OR_HIGHLIGHT_ONLY`）として一覧化する
- **記録の一貫性**:
  - 未特定確定/対象外はDBに無理に保存せず、理由コード付きの出力（JSON/Markdown/CSV）を証跡とする（理由コードの正本は `reason-codes.md`）

## 関連ドキュメント

- [`docs/05-10-schedule-url-coverage.md`](../../05-10-schedule-url-coverage.md): フェーズ10の進捗管理の正本
- [`docs/05-09-instagram-account-url-coverage.md`](../../05-09-instagram-account-url-coverage.md): フェーズ9の参考（同様の構造）

