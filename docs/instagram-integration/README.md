# Instagram連携検討

## 目的

フェーズ6「Instagram連携 & お気に入りでのスケジュール埋め込み」の調査・設計方針を整理するためのドキュメント集。

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
  - **統合済み**: `docs/04-development.md` 9.6節として統合完了（2025-01-22）

- [05-instagram-account-search.md](./05-instagram-account-search.md) - InstagramアカウントURL検索指示書
  - AI向けの検索手順と判断基準
  - ブラウザで直接Google検索を開く方法
  - DB更新手順とRunbookへの記録ルール
  - AIへの依頼テンプレート

## 検討の進め方

1. 各AIが調査・分析を行い、該当ドキュメントに追記する
2. 技術選択肢を比較検討し、`02-technical-options.md` に記録する
3. 決定事項を `03-design-decisions.md` にまとめる
4. 最終的に `04-runbook.md` を完成させ、`docs/04-development.md` に統合する

### AIによるInstagramアカウント検索のベストプラクティス

- **現状の正式手順**: ブラウザで直接Google検索を開き、検索欄にキーワードを入力する方法を優先する
  - `web_search` などの要約ベースの検索結果は、実際のGoogle検索結果と乖離することがあるため、「公式アカウントURLの特定」には不向きな場合がある
  - まずはブラウザツールで `https://www.google.com` を開き、検索ボックスにシンプルなクエリ（例: `おやこっこなか instagram`, `ゆるまる instagram`）をそのまま入力して検索する
- **検索結果の読み方**
  - 公式アカウント候補として、`instagram.com/<アカウント名>/` へのリンクで、施設名＋エリア名（例: 名古屋市中区子育て応援拠点ゆるまる）が明示されているものを最優先とする
  - 施設と無関係な「ゆるまる」「ゆめまる」（個人アカウント、番組キャラ、別サービスなど）は除外し、説明文とプロフィールから施設との関連性を確認する
- **検索APIによる自動化の検討状況**
  - Google Custom Search API / Serper.dev / DuckDuckGo Search などの検索APIを用いて、AIがブラウザ操作を行わずに構造化データからURLを特定する案を、`instagram-integration/ai-comparisons/` 配下で比較検討している
  - 特に、**長期運用では公式API系（Google Custom Search API / Serper.dev）を優先候補としつつ、DuckDuckGo Search はPoC用の補助的手段とする** 方針を想定している
  - 実測ベースの検証（精度・所要時間）が終わり次第、`05-instagram-account-search.md` の手順を検索API版に差し替えるかどうかを判断する
- **記録の仕方**
  - 特定できた場合は、`facilities.instagram_url` に登録すると同時に、`04-runbook.md` の「登録記録」および「気づき」に
    - 使った検索クエリ
    - 公式と判断した根拠（説明文・住所・電話番号など）
    - フォロワー数などの補足情報
    を簡潔にメモし、後続のAI／人間が同じ手順を再利用できるようにする

**進捗状況**（2025-11-26更新）:
- ✅ 01-investigation.md: 調査結果を具体化（詳細ページの確認結果を追加）
- ✅ 02-technical-options.md: 調査結果を反映して更新
- ✅ 03-design-decisions.md: MVP方針を確定、PoC実装方針を明確化
- ✅ 04-runbook.md: 運用手順を具体化、`docs/04-development.md` 9.6節として統合完了
- ✅ 05-instagram-account-search.md: AI向け検索指示書を作成（ブラウザで直接Google検索する方法を確立）

## 関連ドキュメント

- [05 開発フェーズ](../05-00-development-phases.md) - フェーズ6（Instagram連携 & お気に入りでのスケジュール埋め込み）の完了条件
- [02 設計資料](../02-design.md) - schedulesテーブル定義
- [03 API 仕様](../03-api.md) - Instagram Embed API仕様
- [04 開発ガイド](../04-development.md) - スクレイピングガイドライン（9.5.1節）

