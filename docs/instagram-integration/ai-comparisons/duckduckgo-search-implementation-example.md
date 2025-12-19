# DuckDuckGo Search 実装例

このファイルは、`search-api-comparison.md` で言及されている DuckDuckGo Search (Pythonライブラリ) の実装例です。

## 概要

`duckduckgo-search` ライブラリを使用して、子育て拠点のInstagramアカウントURLを検索するPythonコードの例です。

## 実装例

```python
from duckduckgo_search import DDGS
import logging
import re

logger = logging.getLogger(__name__)


def find_instagram_profile(hub_name, ward_name=None):
    """
    子育て拠点のInstagramアカウントURLを検索

    Args:
        hub_name: 施設名（例: "こころと"）
        ward_name: 区名または市区町村名（例: "名古屋市中区"）（オプション）

    Returns:
        Instagram URL（見つからない場合はNone）
    """
    # 検索クエリを構築
    if ward_name:
        query = f'"{hub_name}" {ward_name} 子育て site:instagram.com'
    else:
        query = f'"{hub_name}" 子育て site:instagram.com'

    # 投稿ページを除外するためのパターン
    exclude_patterns = ['/p/', '/reel/', '/tv/']

    # 候補URLとスコアを保持
    candidates = []

    try:
        with DDGS() as ddgs:
            # 上位10件を取得
            results = list(ddgs.text(query, max_results=10))

        for res in results:
            url = res.get('href', '')
            title = res.get('title', '') or ''
            body = res.get('body', '') or ''
            snippet = f"{title} {body}"

            # InstagramのURLか確認
            if 'instagram.com' not in url:
                continue

            # 投稿ページを除外
            if any(pattern in url for pattern in exclude_patterns):
                continue

            # プロフィールページのURL形式か確認
            # 例: https://www.instagram.com/kokoroto.hiroba/
            if not re.match(r'https://www\.instagram\.com/[^/]+/?$', url):
                continue

            # 施設名・区名の一致度でスコアリング
            score = 0
            if hub_name and hub_name in snippet:
                score += 2
            if ward_name and ward_name in snippet:
                score += 1

            candidates.append((score, url.rstrip('/'), snippet))

        if not candidates:
            logger.info("Instagram候補が見つからなかった: %s", query)
            return None

        # スコアの高い順に並べて最上位を採用
        candidates.sort(key=lambda x: x[0], reverse=True)
        best_score, best_url, best_snippet = candidates[0]

        logger.info(
            "Instagram候補を選択: url=%s score=%s snippet=%s",
            best_url,
            best_score,
            best_snippet,
        )
        return best_url

    except Exception as e:
        logger.exception("Instagram検索中にエラーが発生しました: %s", e)
        return None


# 使用例
hub_name = "こころと"
ward_name = "名古屋市中区"
url = find_instagram_profile(hub_name, ward_name)
if url:
    print(f"見つかったURL: {url}")
else:
    print("見つかりませんでした")
```

## 実装のポイント

- **検索クエリ**: `site:instagram.com` を使ってInstagram内を直接検索
- **投稿ページの除外**: `/p/`, `/reel/`, `/tv/` を含むURLを除外し、プロフィールページのみを対象
- **スコアリング**: 施設名・区名がスニペットに含まれるかどうかで候補を評価
- **ログ出力**: どの候補を選んだかをログに記録し、デバッグ・検証を容易にする

## 注意事項

- `duckduckgo-search` は非公式ライブラリのため、DuckDuckGo側の仕様変更により突然動かなくなる可能性があります
- 長期運用を前提とする場合は、Google Custom Search API や Serper.dev などの公式APIを検討してください
- 詳細は [search-api-comparison.md](./search-api-comparison.md) を参照してください
