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

- `Gemini.md` - Geminiからの回答
- `Claude.md` - Claudeからの回答
- `ChatGPT.md` - ChatGPTからの回答
- `Grok.md` - Grokからの回答

## 次のステップ

各AIからの回答を収集後、以下の観点で比較検討します：

1. **効率性**: 検索時間の短縮
2. **確実性**: 正しいURLを特定できる確率
3. **実装可能性**: Cursor（AIアシスタント）で実装可能か
4. **保守性**: 長期的に運用しやすいか

比較検討の結果は、`docs/instagram-integration/05-instagram-account-search.md` に反映し、検索手順を更新します。

## 関連ドキュメント

- [05-instagram-account-search.md](../05-instagram-account-search.md) - 現在のAI向け検索手順
- [20251205-01-phase9-instagram-account-coverage.md](../../dev-sessions/20251205-01-phase9-instagram-account-coverage.md) - フェーズ9実施時の課題記録
- [05-development-phases.md](../../05-development-phases.md) - フェーズ9の定義
