# AI比較検討: InstagramアカウントURL検索方法

## 目的

フェーズ9「InstagramアカウントURLの全面カバー」の実施において、現在の検索方法（AI（Cursor）にブラウザを使いGoogle検索を開いてもらい、検索結果からURLを特定する方法）に課題があることが判明しました。

このフォルダでは、複数のAI（Gemini, Claude, ChatGPT, Grok）に対して同じ課題を提示し、それぞれの提案を比較検討することで、より効率的で確実な検索方法を見つけることを目的とします。

## 背景

### 現在の方法と課題

- **現在の方法**: AI（Cursor）にブラウザを使いGoogle検索を開いてもらい、「[施設名] 子育て instagram」で検索して、URLを開いて内容を確認して特定
- **課題**:
  - 時間がかかる
  - トップに特定して欲しいURLがあるのに見逃すことがある

### 具体例

「こころと」という子育て拠点の名称が分かっているとすると、`https://www.instagram.com/kokoroto.hiroba/` のInstagramのURLが得たい。

## 各AIへの指示

以下のテキストを各AIに提示しています：

---

子育て拠点のまとめアプリを作ってるんだけど、子育て拠点のInstagramのURLを特定する方法で悩んでいます。

良い方法がないか教えて。

具体的には、「こころと」という子育て拠点の名称が分かっているとすると、https://www.instagram.com/kokoroto.hiroba/ のinstagramのURLが得たいです。

今は、AI（Cursor）にブラウザを使いGoogle検索を開いてもらい、「こころと 子育て instagram」で検索して、URLを開いて内容を確認して特定しています。

これだと、時間がかかるし、何故かトップに特定して欲しいURLがあるのに何故か見逃します。

---

## ファイル構成

### 各AIの回答

- `Gemini.md` - Geminiからの回答
- `Claude.md` - Claudeからの回答
- `ChatGPT.md` - ChatGPTからの回答
- `Grok.md` - Grokからの回答

### まとめ・分析ドキュメント

- `summary.md` - 各AIの提案を整理・比較したまとめドキュメント
  - 4つのAIの提案を整理
  - 共通推奨方法、独自提案、実装アプローチをまとめ
  - 次のステップを明確化

- `search-api-comparison.md` - 検索APIの比較資料
  - 現在の方法（Cursorのブラウザ機能）の課題を整理
  - 無料・有料の検索APIを比較（価格、特徴、おすすめ度）
  - 短期PoC向け: DuckDuckGo Search (Pythonライブラリ) - 完全無料、APIキー不要
  - 長期運用向け: Google Custom Search API / Serper.dev など公式・安定性の高いAPIを軸に検討
  - 安定性・保守性（公式APIか/スクレイピングか）の観点も含めて評価
  - 実装例・今後の検証計画を含む

## 次のステップ

各AIからの回答を収集後、以下の観点で比較検討します：

1. **効率性**: 検索時間の短縮
2. **確実性**: 正しいURLを特定できる確率
3. **実装可能性**: Cursor（AIアシスタント）で実装可能か
4. **保守性**: 長期的に運用しやすいか
5. **安定性・公式性**: 公式APIかどうか、仕様変更やブロックのリスク、SLAの有無

比較検討の結果と、検索APIを用いたPoC（例: 10〜20施設でのDuckDuckGo / Google Custom Search / Serper.devの精度・所要時間比較）の実測値は、
`docs/instagram-integration/05-instagram-account-search.md` および関連ドキュメントに順次反映し、正式な検索手順を更新します。

## 開発セッション記録

開発セッションの記録方法については、`.cursor/commands/session-recording.md` を参照してください。

このコマンドは、以下の手順で開発セッションを記録します：

1. `docs/05-00-development-phases.md` のルールと `docs/dev-sessions/template-session.md` に従って、セッションを `docs/dev-sessions/YYYY/MM/` に記録
2. 今日のゴール / 実施ログ / 結果とふりかえり / 次回に持ち越すタスク を埋める
3. 必要があれば `docs/05-00-development-phases.md` のフェーズ進捗も更新

## 関連ドキュメント

### Instagram連携関連

- [05-instagram-account-search.md](../05-instagram-account-search.md) - 現在のAI向け検索手順
- [20251205-01-phase9-instagram-account-coverage.md](../../dev-sessions/2025/12/20251205-01-phase9-instagram-account-coverage.md) - フェーズ9実施時の課題記録
- [05-00-development-phases.md](../../05-00-development-phases.md) - フェーズ9の定義

### 開発セッション関連

- [.cursor/commands/session-recording.md](../../../.cursor/commands/session-recording.md) - 開発セッション記録コマンド
- [docs/dev-sessions/template-session.md](../../dev-sessions/template-session.md) - 開発セッションテンプレート
