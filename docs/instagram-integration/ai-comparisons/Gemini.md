子育て拠点のアプリ開発、素晴らしい取り組みですね！
現状の「AIエージェント（Cursorのブラウザ機能）に操作させる」方法は、**コスト（時間・金銭）がかかる上に、不安定**になりがちです。ブラウザ操作は「ページ読込待ち」や「ポップアップ」に弱く、DOM（ページの構造）が複雑だとAIが見逃すことがよくあります。

より**高速・正確・安価**に特定するための、現実的な実装アプローチを3つ提案します。

-----

### アプローチ1：検索API × ルールベース判定（推奨・最速）

ブラウザを開くのではなく、Google Custom Search APIやBing Search APIを使って**検索結果のデータ（JSON）だけ**を取得し、プログラムで判定する方法です。

AIエージェントに「見てもらう」のではなく、プログラムに「リスト処理」させます。

**具体的なロジック：**

1.  **クエリ工夫:** `site:instagram.com "拠点名" "子育て" -site:instagram.com/p/ -site:instagram.com/reel/`
      * `site:instagram.com`: インスタ内のみ検索
      * `-site:instagram.com/p/`: 個別の投稿ページを除外（プロフィールだけヒットさせる）
2.  **判定:** 検索結果の上位3件を取得し、URLに `instagram.com/` が含まれるものを抽出。

**メリット:**

  * 数秒で完了する。
  * 「見逃し」がなくなる（JSONデータとして確実にURLが返ってくるため）。

### アプローチ2：Pythonライブラリ「DuckDuckGo Search」（無料・手軽）

GoogleのAPIキー設定が面倒な場合、Pythonの `duckduckgo-search` ライブラリを使うと、無料でGoogle検索相当のことができます。Cursorを使われているなら、以下のスクリプトを書いて実行させるのが一番早いです。

**実装イメージ（Python）:**

```python
from duckduckgo_search import DDGS
import re

def find_instagram_profile(hub_name):
    query = f"{hub_name} 子育て site:instagram.com"
    
    with DDGS() as ddgs:
        # 上位5件を取得
        results = list(ddgs.text(query, max_results=5))
        
        for res in results:
            url = res['href']
            # プロフィールURLかどうか簡易チェック（投稿ページ /p/ やリール /reel/ を除外）
            if "instagram.com" in url and "/p/" not in url and "/reel/" not in url:
                return url
    return None

# テスト
hub_name = "こころと"
url = find_instagram_profile(hub_name)
print(f"特定されたURL: {url}")
```

### アプローチ3：公式サイト経由の「2段構え」検索（確実性重視）

インスタのアカウント名は、施設名と全く違うアルファベット（例：`kokoroto.hiroba`）であることが多く、検索だけで一発特定するのが難しいケースがあります。

**確実なフロー:**

1.  Google Places API または検索で、まずは\*\*「拠点の公式ホームページ」\*\*を探す。
2.  そのホームページのHTMLをスクレイピングし、`instagram.com` へのリンクが含まれているか探す。

これなら、「同名の別施設」や「個人の投稿」を誤って拾うリスクが激減します。

-----

### なぜ今のAIエージェントは見逃すのか？

Cursorなどのブラウザ操作AIが見逃す主な理由は以下の通りです。

1.  **Instagramのログイン壁:** インスタはログインしていないブラウザで見ると、すぐに「ログインしてください」というポップアップで画面を覆います。AIはこれに邪魔されて中身を読めていない可能性が高いです。
2.  **DOMの複雑さ:** 最近の検索結果画面やインスタ画面は構造が複雑で、AIが「ここがメインのURLだ」と特定する視覚的・構造的ヒントを見失うことがあります。

### 今すぐできる改善策（Next Step）

まずは、**アプローチ2（DuckDuckGo検索）** を試してみることをお勧めします。APIキー不要で、今すぐコードに組み込めます。

**私の方で、アプローチ2の完全なPythonスクリプト（エラー処理や、投稿ページを除外する正規表現フィルタ付き）を作成しましょうか？**
もしNode.js/TypeScriptなど別の言語環境であれば、そちらに合わせて作成します。