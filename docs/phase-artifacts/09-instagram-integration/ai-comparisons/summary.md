# AI比較検討: InstagramアカウントURL検索方法 - まとめ

## 概要

4つのAI（Gemini, Claude, ChatGPT, Grok）に対して、子育て拠点のInstagramアカウントURLを特定する方法について質問し、それぞれの提案を収集しました。本ドキュメントでは、各AIの提案を整理・比較します。

---

## 各AIの提案まとめ

### Gemini の提案

#### アプローチ1: 検索API × ルールベース判定（推奨・最速）
- **方法**: Google Custom Search APIやBing Search APIを使用
- **検索クエリ**: `site:instagram.com "拠点名" "子育て" -site:instagram.com/p/ -site:instagram.com/reel/`
- **判定**: 検索結果の上位3件からURLを抽出
- **メリット**: 数秒で完了、見逃しがない（JSONデータとして確実にURLが返る）

#### アプローチ2: DuckDuckGo Search（無料・手軽）
- **方法**: Pythonの `duckduckgo-search` ライブラリを使用
- **メリット**: APIキー不要、無料
- **実装**: Pythonスクリプトで実装可能

#### アプローチ3: 公式サイト経由の2段構え検索（確実性重視）
- **方法**: 
  1. Google Places APIまたは検索で公式ホームページを探す
  2. そのホームページのHTMLをスクレイピングし、`instagram.com` へのリンクを探す
- **メリット**: 誤検出リスクが激減

#### 現在の方法の問題点
- Instagramのログイン壁（ポップアップで画面を覆う）
- DOMの複雑さ（AIがメインURLを特定しにくい）

---

### Claude の提案

#### 1. Google検索のsite演算子を使う方法
- **検索クエリ**: `site:instagram.com こころと 子育て拠点`
- **メリット**: 検索結果がInstagramのURLだけに絞られる、見逃しリスクが減る

#### 2. Instagram Graph API（公式だが制約あり）
- **制約**: Facebookページと連携されたビジネスアカウントのみ対象、アクセストークンが必要
- **評価**: 公開情報取得だけなら実用的ではない

#### 3. Perplexity API / SerpAPI を活用
- **Perplexity API**: AI検索エンジンのAPIで精度の高い検索結果が得られる
- **SerpAPI**: Google検索結果を構造化データで取得（有料）

#### 4. 専用のスクレイピング＋検証フロー（推奨）
- **Step 1**: Google検索APIやSerpAPIで上位5-10件のInstagram URLを取得
- **Step 2**: 各候補を検証（プロフィール文、投稿内容から施設名・地域情報を確認）

#### 5. Claude APIを活用した判定
- **方法**: web_searchツールを使ってClaudeに直接検索と判定をさせる

#### 実装の優先順位
1. **短期**: Google検索に`site:instagram.com`を追加
2. **中期**: SerpAPIで構造化データを取得→複数候補から自動判定
3. **長期**: データベースを構築して、一度特定したアカウントは保存

---

### ChatGPT の提案

#### 方法①: Instagram公式検索APIの代替として「非公式API + スクレイピング」（最も精度高い）
- **エンドポイント**: `https://www.instagram.com/web/search/topsearch/?query=こころと`
- **メリット**: 精度高い、高速・安定、AIが見逃すことがない
- **デメリット**: Instagram内部APIなのでアクセス制限に注意

#### 方法②: 候補となるユーザーネームを生成 → 存在チェックを自動化
- **パターン例**: `kokoroto`, `kokoroto.hiroba`, `kokoroto_hiroba`, `hiroba_kokoroto`, `kokoroto_official` など
- **フロー**: 
  1. 名前から候補IDを10〜20個生成
  2. `https://www.instagram.com/ユーザーネーム/` にアクセス
  3. 存在する場合はprofile JSONが返り、404なら存在しない
  4. プロフィールの説明文に施設名があるか確認
- **メリット**: Google検索不要、高速（数秒）、自動化しやすい

#### 方法③: Google Custom Search API を使う（正確 × 安定）
- **検索ワード**: `"こころと" 子育て instagram site:instagram.com`
- **メリット**: ほぼ確実に正しいアカウントがトップに出る、抽出が安定
- **デメリット**: API利用に少し費用がかかる（無料枠あり）

#### 方法④: 施設の公式サイト → SNSリンクをクロールする
- **フロー**: 
  1. 公式サイトを検索
  2. HTMLから `<a href="https://www.instagram.com/...">` を抽出
- **メリット**: 正確性100%、一度ヒットすれば確実
- **デメリット**: 公式サイトがない場合やSNSリンクがない場合は使えない

#### 方法⑤: Google検索をAIにやらせる（安定化対策あり）
- **方法**: 検索結果のHTMLだけを直接クロールして分析
- **メリット**: ブラウザで表示を読むより圧倒的に安定

#### おすすめ（ChatGPT）
1. **No.1**: Instagram内部検索API（非公開エンドポイント）+ プロフィール内容チェック
2. **次点**: ユーザーネーム候補生成 + 存在チェック

---

### Grok の提案

#### 最高精度（95%以上）でほぼ一発で取れる方法

1. **Google検索の「site:instagram.com」で施設名完全一致検索**
   - 検索クエリ: `「こころと」 site:instagram.com`
   - ほぼ100%の場合、正解のURLが1位に出る

2. **より厳密にしたいとき（同名施設が複数ある場合）**
   - 検索クエリ: `「こころと」 site:instagram.com 广島 OR 広島 OR 広島市 OR 安芸区`
   - 市区町村名をORで入れるとほぼ確実

3. **Instagram内で直接検索（ブラウザで可能）**
   - URL: `https://www.instagram.com/explore/search/keyword/?q=こころと`
   - プロフィールに施設名が書いてあるアカウントが上位にほぼ確実に出る

#### 自動化しやすい鉄板パターン（正規表現で9割以上取れる）

日本の子育て拠点のInstagramアカウント名の法則性:

| パターン例 | 該当例 | 成功率 |
|-----------|--------|--------|
| 施設名（ひらがな）.hiroba | kokoroto.hiroba | ★★★★★ |
| 施設名（ひらがな）_hiroba | kokoroto_hiroba | ★★★★ |
| hiroba_施設名 | hiroba_kokoroto | ★★★ |
| 施設名（ひらがな）koho | kokoroto_koho（広報用） | ★★★ |
| 施設名（ひらがな）oyako | kokorotooyako | ★★ |
| city名 + hiroba + 施設名短縮形 | hiroshima_kokoroto | ★★ |

→ 「こころと」が分かっていれば、候補URLパターンを全部試せば99%取れる

#### 今すぐ試せる最強ワザ（手動でも自動でも最速）

**魔法の検索式**:
```
「こころと」 (inurl:instagram.com intext:"子育て" intext:"広場" -inurl:reel -inurl:p)
```

- `inurl:instagram.com` → Instagramのページだけ
- `intext:"子育て" intext:"広場"` → 子育て施設っぽいものだけ
- `-inurl:reel -inurl:p` → 投稿ページではなくプロフィールページだけ表示

**成功率**: 500件以上試して失敗したのは2件だけ

#### おすすめの自動化フロー（Grokの実際のやり方）

1. 施設名（例：「こころと」）を取得
2. Google Custom Search API または Serper.dev などで以下を検索: `「こころと」 site:instagram.com`
3. 上位1～3件のURLを取得
4. 取れなかった場合のみ候補URLパターン生成して存在チェック
5. それでも取れなかったらまれな同名施設は手動

**実績**: 月間1万件以上の子育て拠点データを収集中、Instagramアカウントの手動補正は1%未満

---

## 提案の比較

### 共通して推奨されている方法

1. **Google検索の `site:instagram.com` 演算子を使用**
   - 全AIが推奨
   - 検索結果をInstagramのURLに絞り込める
   - 現在の方法の改善として即座に適用可能

2. **Google Custom Search API / SerpAPI の活用**
   - Gemini, Claude, Grok が推奨
   - 構造化データとして結果を取得できるため、AIが見逃すリスクが低い
   - 有料だが無料枠あり

3. **ユーザーネーム候補生成 + 存在チェック**
   - ChatGPT, Grok が推奨
   - 日本の子育て拠点のアカウント名に法則性がある
   - パターンマッチングで高確率で特定可能

### 独自の提案

- **Gemini**: DuckDuckGo Search（無料・手軽）、公式サイト経由の2段構え検索
- **Claude**: Perplexity API、Claude APIを活用した判定
- **ChatGPT**: Instagram内部検索API（非公開エンドポイント）の活用
- **Grok**: 魔法の検索式（`inurl` + `intext` + 除外条件の組み合わせ）

### 現在の方法の問題点（AIの指摘）

1. **Instagramのログイン壁**（Gemini）
   - ログインしていないブラウザで見るとポップアップで画面を覆う
   - AIが中身を読めていない可能性

2. **DOMの複雑さ**（Gemini）
   - 検索結果画面やインスタ画面の構造が複雑
   - AIがメインURLを特定する視覚的・構造的ヒントを見失う

3. **時間がかかる**（全AI共通）
   - ブラウザ操作はページ読込待ちに弱い
   - 各施設ごとに手動で確認する必要がある

---

## 推奨される実装アプローチ

### 短期（即座に適用可能）

1. **検索クエリの改善**
   - `site:instagram.com` を追加
   - 投稿ページを除外: `-site:instagram.com/p/ -site:instagram.com/reel/`
   - より厳密な検索: `「施設名」 site:instagram.com 市区町村名`

2. **検索結果のHTMLを直接取得**
   - ブラウザで表示を読むのではなく、HTMLをクロールして分析
   - より安定した結果が得られる

### 中期（自動化の実装）

1. **Google Custom Search API / SerpAPI の導入**
   - 構造化データとして結果を取得
   - 複数候補から自動判定

2. **ユーザーネーム候補生成 + 存在チェック**
   - 日本の子育て拠点のアカウント名パターンを活用
   - 候補URLを生成してHEADリクエストで存在確認

3. **Instagram内部検索API（非公開エンドポイント）の活用**
   - `https://www.instagram.com/web/search/topsearch/?query=施設名`
   - アクセス制限に注意

### 長期（システム化）

1. **データベースの構築**
   - 一度特定したアカウントは保存
   - 手動補正の履歴を記録

2. **複数手法の組み合わせ**
   - 検索API → 候補生成 → 公式サイト確認 の順で試行
   - 各手法の成功率を記録し、最適な順序を決定

---

## 次のステップ

1. **短期改善の実装**
   - 検索クエリに `site:instagram.com` を追加
   - 検索結果のHTMLを直接取得する方法に変更

2. **中期改善の検討**
   - Google Custom Search API / SerpAPI の導入可否を検討
   - ユーザーネーム候補生成ロジックの実装

3. **効果測定**
   - 改善前後の成功率・所要時間を比較
   - 各手法の効果を評価

4. **ドキュメント更新**
   - `docs/phase-artifacts/09-instagram-integration/05-instagram-account-search.md` に新しい検索手順を反映

---

## 参考: 各AIの回答ファイル

- [Gemini.md](./Gemini.md)
- [Claude.md](./Claude.md)
- [ChatGPT.md](./ChatGPT.md)
- [Grok.md](./Grok.md)
