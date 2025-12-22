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

## 関連ドキュメント

- [`docs/05-10-schedule-url-coverage.md`](../../05-10-schedule-url-coverage.md): フェーズ10の進捗管理の正本
- [`docs/05-09-instagram-account-url-coverage.md`](../../05-09-instagram-account-url-coverage.md): フェーズ9の参考（同様の構造）

