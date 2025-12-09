# 検索API比較: InstagramアカウントURL検索の自動化

## 背景と課題

### 現在の方法

現在、Cursorのブラウザ機能を使って以下の手順でInstagramアカウントURLを検索しています：

1. ブラウザツールでGoogle検索を直接開く
2. `「施設名」 子育て instagram` や `site:instagram.com "施設名"` で検索
3. 検索結果のスナップショットから情報を抽出
4. Instagramページに移動して内容を確認

### 課題

**Cursorのブラウザ機能（autoモデル）の性能ブレによる問題**:

- 「こころと 子育て」でGoogle検索すれば検索結果は出ている
- しかし、Cursorのブラウザ機能では上手く検索できない時がある
- autoモデルを使うため、性能にブレがある
- 検索結果のスナップショットから情報を抽出するのに時間がかかる
- トップに特定して欲しいURLがあるのに見逃すことがある

### 解決策の方向性

**検索APIの活用**:

- ブラウザ操作ではなく、検索APIから構造化データとして結果を取得
- AIが見逃すリスクが低い（JSONデータとして確実にURLが返る）
- 処理が高速（数秒で完了）
- 再現性が高い

**要件**:

- なるべく無料で使いたい
- 月間44件程度の施設を検索する想定（将来的に増える可能性あり）

---

## 検索API比較表

### 無料プランがあるAPI

| API名 | 無料プラン | 無料プランの制限 | 有料プラン（最小） | 1,000クエリあたりの価格（有料） | おすすめ度 | 備考 |
|-------|-----------|----------------|------------------|------------------------|-----------|------|
| **DuckDuckGo Search (Python)** | ✅ 完全無料 | 制限なし（利用規約遵守） | なし | - | ⭐⭐⭐⭐⭐ | APIキー不要、Pythonライブラリで簡単に使える |
| **Google Custom Search API** | ✅ 100クエリ/日 | 1日100クエリまで | $5/1,000クエリ | $5.00 | ⭐⭐⭐⭐ | 無料枠が少ないが、Google検索の精度が高い |
| **Serper.dev** | ✅ 200クレジット | 初回のみ200クレジット | $5/6,250クレジット | $0.80 | ⭐⭐⭐⭐⭐ | 最も安価、pay-as-you-goで月額不要 |
| **Brave Search API** | ✅ 2,000クエリ/月 | 月2,000クエリまで | $3/1,000クエリ | $3.00 | ⭐⭐⭐⭐ | 独立したWebインデックス、プライバシー重視 |
| **Zenserp** | ✅ 50リクエスト/月 | 月50リクエストまで | $49.99/5,000リクエスト | $10.00 | ⭐⭐⭐ | 無料枠が少ない |

### 有料のみのAPI

| API名 | 最小プラン | 1,000クエリあたりの価格 | おすすめ度 | 備考 |
|-------|-----------|----------------------|-----------|------|
| **SerpAPI** | $50/5,000リクエスト | $10.00 | ⭐⭐⭐ | 高機能だが高価 |
| **SearchAPI.io (DuckDuckGo)** | $40/10,000リクエスト | $4.00 | ⭐⭐ | 第三者が提供するDuckDuckGo API |

---

## 詳細比較

### 1. DuckDuckGo Search (Pythonライブラリ) ⭐⭐⭐⭐⭐

**概要**: Pythonの `duckduckgo-search` ライブラリを使用。APIキー不要で完全無料。

**価格**: 
- **完全無料**（利用規約遵守）

**特徴**:
- ✅ APIキー不要
- ✅ 完全無料
- ✅ インストールが簡単: `pip install duckduckgo-search`
- ✅ 複数の検索タイプに対応（テキスト、画像、ニュース、動画）
- ⚠️ DuckDuckGoの検索結果を使用（Googleとは異なる結果になる可能性）

**実装例**:
```python
from duckduckgo_search import DDGS

def find_instagram_profile(hub_name):
    query = f"{hub_name} 子育て site:instagram.com"
    
    with DDGS() as ddgs:
        results = list(ddgs.text(query, max_results=5))
        
        for res in results:
            url = res['href']
            if "instagram.com" in url and "/p/" not in url and "/reel/" not in url:
                return url
    return None
```

**推奨度**: ⭐⭐⭐⭐⭐
- **理由**: 完全無料で制限なし、APIキー不要、実装が簡単
- **注意点**: Google検索とは結果が異なる可能性があるが、Instagramアカウント検索には十分

---

### 2. Google Custom Search API ⭐⭐⭐⭐

**概要**: Googleが提供する公式検索API。Custom Search Engineを作成して使用。

**価格**: 
- **無料**: 1日100クエリまで
- **有料**: $5/1,000クエリ（100クエリ超過分）

**特徴**:
- ✅ Google検索の高い精度
- ✅ 無料枠あり（1日100クエリ）
- ✅ 公式APIで安定性が高い
- ⚠️ Custom Search Engineの設定が必要
- ⚠️ APIキーの取得が必要
- ⚠️ 無料枠が少ない（月間約3,000クエリ）

**月間44件の検索の場合**:
- 無料枠内で収まる（1日100クエリ × 30日 = 3,000クエリ/月）

**推奨度**: ⭐⭐⭐⭐
- **理由**: Google検索の精度が高い、無料枠で月間44件は十分
- **注意点**: Custom Search Engineの設定とAPIキー取得が必要

---

### 3. Serper.dev ⭐⭐⭐⭐⭐

**概要**: Google検索結果を構造化データで取得できるサービス。pay-as-you-goモデル。

**価格**: 
- **無料**: 初回のみ200クレジット
- **Starter**: $5/6,250クレジット（$0.80/1,000リクエスト）
- **Standard**: $30/約46,000クレジット（$0.65/1,000リクエスト）
- **Scale**: $100/約222,000クレジット（$0.45/1,000リクエスト）

**特徴**:
- ✅ 最も安価な有料オプション（$0.80/1,000リクエスト）
- ✅ pay-as-you-goで月額料金不要
- ✅ Google検索結果を使用（高い精度）
- ✅ JSON形式で構造化データを取得
- ✅ リアルタイム検索結果
- ⚠️ 初回のみ200クレジット無料（その後は有料）

**月間44件の検索の場合**:
- 初回200クレジットで試せる
- その後は約$0.04/月（44件 × $0.80/1,000 = $0.035）

**推奨度**: ⭐⭐⭐⭐⭐
- **理由**: 最も安価で、Google検索の精度を活用できる
- **注意点**: 初回無料枠のみで、その後は有料（ただし非常に安価）

---

### 4. Brave Search API ⭐⭐⭐⭐

**概要**: Braveが提供する独立したWebインデックスを使用した検索API。

**価格**: 
- **無料**: 月2,000クエリまで
- **有料**: $3/1,000クエリ（2,000クエリ超過分）

**特徴**:
- ✅ 無料枠が大きい（月2,000クエリ）
- ✅ 独立したWebインデックス（Googleとは異なる結果）
- ✅ プライバシー重視
- ⚠️ Google検索とは結果が異なる可能性

**月間44件の検索の場合**:
- 無料枠内で十分（月2,000クエリ）

**推奨度**: ⭐⭐⭐⭐
- **理由**: 無料枠が大きく、月間44件は余裕
- **注意点**: Google検索とは結果が異なる可能性

---

### 5. Zenserp ⭐⭐⭐

**概要**: 複数の検索エンジンに対応した検索結果取得サービス。

**価格**: 
- **無料**: 月50リクエストまで
- **有料**: $49.99/5,000リクエスト（$10/1,000リクエスト）

**特徴**:
- ✅ 複数の検索エンジンに対応
- ⚠️ 無料枠が少ない（月50リクエスト）
- ⚠️ 有料プランが高価（$10/1,000リクエスト）

**月間44件の検索の場合**:
- 無料枠内で収まるが、余裕がない

**推奨度**: ⭐⭐⭐
- **理由**: 無料枠が少なく、有料プランが高価

---

## おすすめランキング

### 1位: DuckDuckGo Search (Pythonライブラリ) ⭐⭐⭐⭐⭐

**理由**:
- 完全無料で制限なし
- APIキー不要で実装が簡単
- 月間44件程度なら十分対応可能
- 将来的に検索件数が増えても追加コストなし

**デメリット**:
- Google検索とは結果が異なる可能性（ただし、Instagramアカウント検索には十分）

**推奨するケース**:
- 無料で完結したい
- APIキーの管理を避けたい
- Python環境がある

---

### 2位: Serper.dev ⭐⭐⭐⭐⭐

**理由**:
- 最も安価な有料オプション（$0.80/1,000リクエスト）
- Google検索の高い精度を活用できる
- pay-as-you-goで月額料金不要
- 月間44件なら約$0.04/月と非常に安価

**デメリット**:
- 初回無料枠のみ（その後は有料）

**推奨するケース**:
- Google検索の精度を重視したい
- わずかなコスト（月数円）は許容できる
- 将来的に検索件数が増える可能性がある

---

### 3位: Google Custom Search API ⭐⭐⭐⭐

**理由**:
- Google検索の高い精度
- 無料枠（1日100クエリ）で月間44件は十分
- 公式APIで安定性が高い

**デメリット**:
- Custom Search Engineの設定が必要
- APIキーの取得が必要
- 無料枠が少ない（将来的に増える場合は有料）

**推奨するケース**:
- Google検索の精度を重視したい
- 無料枠内で完結できる見込み
- 公式APIを優先したい

---

### 4位: Brave Search API ⭐⭐⭐⭐

**理由**:
- 無料枠が大きい（月2,000クエリ）
- 独立したWebインデックス

**デメリット**:
- Google検索とは結果が異なる可能性

**推奨するケース**:
- 無料枠内で完結したい
- Google以外の検索結果も試したい

---

## 実装推奨アプローチ

### フェーズ1: 無料で試す（DuckDuckGo Search）

1. **DuckDuckGo Search (Pythonライブラリ) を実装**
   - 完全無料で制限なし
   - APIキー不要で実装が簡単
   - 月間44件程度なら十分対応可能

2. **検証**
   - 実際の施設名で検索して精度を確認
   - 検索結果からInstagram URLを抽出できるか確認

### フェーズ2: 必要に応じて有料APIに移行

1. **DuckDuckGo Searchで精度が不十分な場合**
   - Serper.devに移行（$0.80/1,000リクエスト）
   - Google検索の高い精度を活用

2. **検索件数が増えた場合**
   - Google Custom Search APIの無料枠を検討
   - またはSerper.devの有料プランに移行

---

## 実装例（DuckDuckGo Search）

```python
from duckduckgo_search import DDGS
import re

def find_instagram_profile(hub_name, ward_name=None):
    """
    子育て拠点のInstagramアカウントURLを検索
    
    Args:
        hub_name: 施設名（例: "こころと"）
        ward_name: 区名（例: "名古屋市中区"）（オプション）
    
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
    
    try:
        with DDGS() as ddgs:
            # 上位5件を取得
            results = list(ddgs.text(query, max_results=5))
            
            for res in results:
                url = res.get('href', '')
                
                # InstagramのURLか確認
                if 'instagram.com' not in url:
                    continue
                
                # 投稿ページを除外
                if any(pattern in url for pattern in exclude_patterns):
                    continue
                
                # プロフィールページのURLを返す
                # 例: https://www.instagram.com/kokoroto.hiroba/
                if re.match(r'https://www\.instagram\.com/[^/]+/?$', url):
                    return url.rstrip('/')
            
            return None
            
    except Exception as e:
        print(f"検索エラー: {e}")
        return None

# 使用例
hub_name = "こころと"
ward_name = "名古屋市"
url = find_instagram_profile(hub_name, ward_name)
if url:
    print(f"見つかったURL: {url}")
else:
    print("見つかりませんでした")
```

---

## まとめ

### 推奨: DuckDuckGo Search (Pythonライブラリ)

**理由**:
1. **完全無料**: 制限なし、APIキー不要
2. **実装が簡単**: Pythonライブラリをインストールするだけ
3. **月間44件程度なら十分**: 将来的に増えても追加コストなし
4. **Cursorで実装可能**: PythonコードとしてCursorで実行できる

**次のステップ**:
1. DuckDuckGo Searchを実装して検証
2. 精度が不十分な場合はSerper.devに移行を検討（$0.80/1,000リクエスト）

### 代替案: Serper.dev

**理由**:
1. **最も安価な有料オプション**: $0.80/1,000リクエスト
2. **Google検索の精度**: 高い精度を期待できる
3. **月間44件なら約$0.04/月**: 非常に安価

**次のステップ**:
1. 初回200クレジットで試す
2. 精度を確認してから継続利用を判断

---

## 参考資料

- [DuckDuckGo Search Python Library](https://pypi.org/project/duckduckgo-search/)
- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview)
- [Serper.dev Pricing](https://serpex.dev/pricing)
- [Brave Search API](https://brave.com/search/api/)
- [各AIの提案まとめ](./summary.md)
