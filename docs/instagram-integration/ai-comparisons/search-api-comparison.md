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
- 月間44件程度の施設を検索する想定（フェーズ9の現行スコープからの暫定見積もり。将来的に対象自治体・施設数が増える可能性あり）

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
- **重要な注意**:
  - `duckduckgo-search` は DuckDuckGo 公式の検索APIではなく、**検索結果ページをスクレイピングする非公式ライブラリ** である
  - DuckDuckGo 側のHTML構造変更や対策により、**予告なく動かなくなるリスク** がある（SLAや後方互換性の保証はない）
  - ライブラリのメンテ状況やIssueを継続的にウォッチする必要がある
  - 本ドキュメントでは、**短期のPoCや簡易ツール向けには非常に有力な選択肢**としつつ、**長期運用では後述の公式API系（Google Custom Search API / Serper.devなど）を優先する** 方針とする

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

### 1位: Google Custom Search API ⭐⭐⭐⭐（長期運用の第1候補）

**理由**:
- Google検索の高い精度（ローカルな施設名・地名に対して強い）
- 公式APIであり、仕様変更リスクやブロックリスクが相対的に低い
- 無料枠（1日100クエリ）で、月間44件程度の利用であれば**完全に無料で収まる**

**デメリット**:
- Custom Search Engineの設定が必要
- APIキーの取得・管理が必要

**推奨するケース**:
- 本番運用や長期利用を前提としたワークフロー
- ローカルな子育て拠点などに対して、**できるだけ確実に正しいURLを取りたい** ケース
- 将来的に検索件数が増える可能性があるが、安定性・公式性を優先したいケース

---

### 2位: Serper.dev ⭐⭐⭐⭐⭐（コスト効率の良い有料候補）

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

### 3位: DuckDuckGo Search (Pythonライブラリ) ⭐⭐⭐⭐（PoC / 補助的な候補）

**理由**:
- 完全無料で制限なし（利用規約の範囲内）
- APIキー不要でインストールも簡単
- Pythonコードだけで完結し、**PoCや一時的なツール実装に向いている**

**デメリット**:
- DuckDuckGo 公式の検索APIではなく、**検索結果ページをスクレイピングする非公式ライブラリ**である
- DuckDuckGo 側の仕様変更・ブロックなどにより、**突然動かなくなる可能性がある**
- 日本語ローカル施設の検索精度は、一般に Google 検索に比べて劣る可能性がある

**推奨するケース**:
- まずは「検索API + ルールベース判定」がワークフローとして有効かどうかを**素早く検証したいPoC段階**
- APIキー取得やCSE設定なしで、AIからすぐに動くサンプルコードを試したい場合
- 本番では Google Custom Search API / Serper.dev など公式APIを使う前提で、**実験用・補助的手段として使う** 場合

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

## 検証計画（精度・所要時間の評価）

本ドキュメントでの「おすすめ」は机上の比較だけでなく、**少数の実データでの検証結果を踏まえて最終決定する** 方針とする。

### 検証対象

- DuckDuckGo Search（Pythonライブラリ）
- Google Custom Search API
- Serper.dev（必要に応じて）

### 検証方法のイメージ

1. サンプルとして 10〜20 件程度の施設（名前・区名・住所が既知のもの）を選定する
2. 各APIで、同一の検索クエリポリシー（例: `site:instagram.com "<施設名>" "<区名>" 子育て`）を用いて検索する
3. 以下を記録する:
   - **成功率**: 「公式と思われるInstagramアカウントURL」を上位 N 件以内から正しく特定できた割合
   - **所要時間**: 1件あたりの平均応答時間
   - **実装の複雑さ**: 認証・設定・エラー処理の手間
4. 結果を `docs/instagram-integration/dev-sessions/` などに記録し、最終的な採用方針を `03-design-decisions.md` / `05-instagram-account-search.md` に反映する

---

## 実装推奨アプローチ

### フェーズ1: PoCとして無料で試す（DuckDuckGo Search + 少数のGoogle系API）

1. **DuckDuckGo Search (Pythonライブラリ) を実装**
   - 完全無料で制限なし
   - APIキー不要で実装が簡単
   - AIからすぐに実行できる検証用コードとして適している

2. **あわせて、Google Custom Search API または Serper.dev でごく少数のサンプルを試す**
   - CSE設定とAPIキー取得を行い、数件だけでも動作させてみる
   - DuckDuckGoと比べた「精度差」「実装負荷」を体感レベルで把握する

3. **検証**
   - 実際の施設名で検索して精度を確認
   - 検索結果からInstagram URLを抽出できるか確認
   - 成功率・所要時間・実装/運用コストを簡易に記録する

### フェーズ2: 必要に応じて有料APIに移行

1. **DuckDuckGo Searchで精度が不十分な場合**
   - Serper.dev または Google Custom Search API に移行
   - Google検索の高い精度を活用

2. **検索件数が増えた場合**
   - Google Custom Search APIの無料枠を検討
   - またはSerper.devの有料プランに移行

---

### エラーハンドリング・フォールバックの方針

検索APIを本番ワークフローに組み込む場合、以下の点を最低限おさえる:

- **タイムアウト・リトライ**
  - 各リクエストにタイムアウト（例: 5〜10秒）を設定する
  - ネットワークエラーや一時的な 5xx エラー時のみ、最大2〜3回まで指数バックオフでリトライする
- **フォールバック戦略**
  - 優先順位の例:
    1. 公式API（Google Custom Search API / Serper.dev）
    2. それでも失敗した場合のみ DuckDuckGo Search などの補助的手段
    3. それでも特定できなければ「未特定」として Runbook に理由を記録し、**無理に推測でURLを埋めない**
- **ログ記録**
  - どのAPIで、どの検索クエリを使って、どの候補URLを返したかを最低限ログに残す
  - 後から「なぜこのURLになったのか」を追跡できるようにすることで、誤判定の修正が容易になる

## 実装例（DuckDuckGo Search）

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

---

## まとめ

### 長期運用の推奨: Google Custom Search API / Serper.dev

**理由**:
1. **公式API / Google検索の精度**: ローカル施設に対して高い精度が期待できる
2. **安定性**: 正規のAPIとして提供されており、HTMLスクレイピング系ライブラリより長期運用に向く
3. **コスト**: 月間44件程度であれば、Google Custom Search API の無料枠内で収まる
4. **拡張性**: 将来的に件数が増えた場合でも、Serper.dev など安価な有料APIにスムーズに移行できる

**次のステップ**:
1. 少数サンプルで Google Custom Search API / Serper.dev を動かし、精度・所要時間・実装コストを確認する
2. その結果を踏まえ、どちらかを「本番用の標準API」として `03-design-decisions.md` / `05-instagram-account-search.md` に明記する

### 短期PoCの推奨: DuckDuckGo Search (Pythonライブラリ)

**理由**:
1. **完全無料・APIキー不要**: すぐに試せる
2. **実装が簡単**: Pythonライブラリをインストールするだけで動作する
3. **PoCに十分**: 「検索API + ルールベース判定」のワークフローが有効かどうかを素早く検証できる

**次のステップ**:
1. `duckduckgo-search` を用いたPoCを作成し、サンプル施設で成功率・所要時間を計測する
2. 上記のGoogle系APIとの比較結果をもとに、「PoC専用として継続利用するか / 本番では公式APIに切り替えるか」を判断する

---

## 参考資料

- [DuckDuckGo Search Python Library](https://pypi.org/project/duckduckgo-search/)
- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview)
- [Serper.dev Pricing](https://serpex.dev/pricing)
- [Brave Search API](https://brave.com/search/api/)
- [各AIの提案まとめ](./summary.md)
