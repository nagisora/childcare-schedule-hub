# Instagram連携検討

## 目的

フェーズ6「Instagram連携によるスケジュールURL取得フロー」の調査・設計方針を整理するためのドキュメント集。

複数のAIからの知見を集約し、最適な実装方針を決定することを目的とする。

## ドキュメント構成

- [01-investigation.md](./01-investigation.md) - 調査結果
  - 現状のDB状態（instagram_url設定状況）
  - 名古屋市サイトの構造分析
  - サンプルアカウントの投稿形式分析

- [02-technical-options.md](./02-technical-options.md) - 技術選択肢の比較
  - Instagram公式API（oEmbed）
  - 手動登録フロー
  - スクレイピング（自治体サイト経由）
  - 利用規約・制約の整理

- [03-design-decisions.md](./03-design-decisions.md) - 決定事項・採用方針
  - MVPでの方針
  - schedulesテーブルの更新ポリシー
  - 将来の拡張方針

- [04-runbook.md](./04-runbook.md) - 運用手順書
  - 手動入力フロー
  - データ投入手順
  - （確定後に `docs/04-development.md` 9.6節へ転記予定）

## 検討の進め方

1. 各AIが調査・分析を行い、該当ドキュメントに追記する
2. 技術選択肢を比較検討し、`02-technical-options.md` に記録する
3. 決定事項を `03-design-decisions.md` にまとめる
4. 最終的に `04-runbook.md` を完成させ、`docs/04-development.md` に統合する

## 関連ドキュメント

- [05 開発フェーズ](../05-development-phases.md) - フェーズ6の完了条件
- [02 設計資料](../02-design.md) - schedulesテーブル定義
- [03 API 仕様](../03-api.md) - Instagram Embed API仕様
- [04 開発ガイド](../04-development.md) - スクレイピングガイドライン（9.5.1節）

