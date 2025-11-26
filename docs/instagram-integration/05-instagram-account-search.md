# 05 InstagramアカウントURL検索指示書

## 1. 目的

- **目的**: `facilities.instagram_url` に、各施設の「公式と思われる Instagram アカウントURL」を登録するための、AI向け検索手順と判断基準を統一すること。
- **想定ユースケース**:
  - 人間がAIに対して、次のように依頼できるようにする:
    - 「中川区のInstagramのURLを取得して。やり方は `docs/instagram-integration/05-instagram-account-search.md` を参照して。」
    - 「○○区の施設のうち、まだ `instagram_url` がNULLのものだけ対象に同じことをやって。」

## 2. 前提条件

- **技術前提**
  - Supabase プロジェクトが存在し、`facilities` テーブルが作成済み。
  - Supabase MCP から SQL を実行できる（`mcp_supabase_execute_sql` など）。
  - Cursor などのエディタから、ブラウザツールで **Google を直接開いて検索欄に入力できる**。
- **利用規約前提**
  - Instagram 直接スクレイピングは禁止（HTML解析ではなく、通常のブラウザ閲覧＋公式検索のみを使う）。
  - Instagram公式API（oEmbed等）は表示側で使用し、本指示書では「アカウントURLの特定」のみを対象とする。

## 3. 対象施設の決め方

- **区単位での例（中川区の場合）**
  - Supabase MCP で次のようなクエリを実行し、対象施設を取得する:

```sql
SELECT id, name, ward_name, address_full_raw, instagram_url
FROM facilities
WHERE ward_name = '中川区'
ORDER BY name;
```

- **対象の絞り込み**
  - 基本方針:
    - `instagram_url IS NULL` の施設のみを対象にする。
    - 検索回数を抑えるため、必要に応じて「優先度の高い施設」から順に実施する（人間がリストアップして渡してもよい）。

## 4. Instagramアカウント検索 手順サマリ（AI向け）

AI は、各施設ごとに **以下のステップを順に実行**すること。

### 4.1 施設情報の確認

- `name`, `ward_name`, `address_full_raw` を確認し、区名・住所を把握する。

### 4.2 Google 検索の実行（必ずブラウザで）

- **重要**: `web_search` ツールではなく、**ブラウザツールで直接 Google を開く**こと。
- 手順:
  1. ブラウザツールで `https://www.google.com` を開く。
  2. 検索欄に、次のようなシンプルなクエリを順に入力して検索する:
     - `"<施設名>" instagram`
     - `"<施設名>" 名古屋 <区名> instagram`
     - 例（ゆるまる・中川区の場合）:
       - `ゆるまる instagram`
       - `ゆるまる 名古屋 中川区 instagram`
  3. 検索結果ページが表示されたら、検索結果の中から `instagram.com/...` へのリンクを探す。

### 4.3 検索結果から候補を絞り込む

- **検索結果ページでのURLの見つけ方**:
  - 検索結果ページには、各検索結果が **リンク要素**（タイトル部分の`<h3>`など）として表示されており、そのリンクに実際の遷移先URLが含まれている。
  - 例: 「名古屋市地域子育て支援拠点 おひさまのおうち …」というタイトルのリンク先URLが `https://www.instagram.com/ohisamanoouchi/` のようになっている。
  - **基本方針**: 「検索結果のリンクそれぞれについて **URLを取得し、`instagram.com` ドメインだけを候補として残す**」というシンプルな流れにする。
  - **具体的な手順（イメージ）**:
    1. Googleの検索結果ページが開いた状態で、検索結果の「通常のリンク（タイトル部分）」を上から順に対象とする（1件目、2件目、3件目…）。
    2. 各リンクに対して、**リンク先URL** を取得する。
       - 実装方法の例:
         - リンク要素の `url` 属性を直接確認する。
         - またはリンクをクリックして遷移し、現在のページURL（`pageState.url`）が `https://www.instagram.com/...` かどうかを確認する。
    3. ドメインが `instagram.com` ではないURLは候補から除外する。
    4. ドメインが `instagram.com` のURLだけを「Instagram候補」として残す。
    5. 残った候補について、リンクテキスト（タイトル）や検索結果のスニペット、遷移先のプロフィール文などから
       - 施設名（例: ゆるまる、おひさまのおうち）
       - エリア情報（例: 名古屋市中川区 など）
       - 子育て応援拠点 / 地域子育て支援拠点 である旨
       が含まれているかを確認する。
    6. 上記の条件を満たすものを「公式と思われる候補」として次のステップ（4.4）に渡す。
- **公式と思われる候補の特定**:
  - まず、**検索結果の上位**に現れる `instagram.com/...` ドメインへのリンクを確認する。
  - 見出し要素（`<h3>`）のテキストや、検索結果のスニペット、Instagramのプロフィール文に
    - 施設名（例: ゆるまる）
    - エリア情報（例: 名古屋市中川区、春田 など）
    - 子育て応援拠点 / 地域子育て支援拠点 である旨
    が含まれているものを優先する。
  - プロフィールや投稿が、明らかに子育て拠点としての活動内容になっている。
- **除外すべきパターン（公式とはみなさない）**:
  - タレント・YouTuber・番組キャラクターなど、施設と無関係な個人アカウント。
  - 治療院・ヨガ講師・物販ブランドなど、名称は似ていても住所・説明が明らかに異なるもの。

### 4.4 候補が1つに絞れた場合

- InstagramプロフィールのURL（例: `https://www.instagram.com/yurumaru_nakagawa/`）を **1つだけ**「公式と思われる候補」として採用する。

### 4.5 公式と判断できる候補がない場合の「あきらめ条件」

- 以下の条件をすべて満たす場合、その施設については **今回のセッションでは「未特定」扱い**とする:
  - 上記のシンプルなクエリを試しても、`instagram.com/...` の結果が出ない、または施設と無関係なものばかり。
  - 検索結果 1〜2 ページ、および `site:instagram.com "<施設名>"` 相当の検索を見ても、住所・説明から施設との関連が説明できない。
- この場合、`instagram_url` は更新せず `NULL` のままにし、Runbook 側に「未特定」として理由を記録する。

## 5. DB 更新手順（AI向け）

### 5.1 対象レコードの再確認

```sql
SELECT id, name, instagram_url
FROM facilities
WHERE name = '<施設名>';
```

### 5.2 更新実行

```sql
UPDATE facilities
SET instagram_url = '<確定したInstagramプロフィールURL>'
WHERE id = '<対象施設のid>';
```

### 5.3 検証クエリ

```sql
SELECT id, name, instagram_url
FROM facilities
WHERE id = '<対象施設のid>';
```

## 6. AIへの依頼テンプレート（人間向け）

### 6.1 区単位で依頼する例（中川区）

```text
中川区の子育て応援拠点について、公式と思われるInstagramアカウントURLを調べて
`facilities.instagram_url` に登録してください。

手順と判断基準は `docs/instagram-integration/05-instagram-account-search.md`
を参照してください。

対象は ward_name = '中川区' かつ instagram_url IS NULL の施設に限定してください。
見つからなかった施設は無理に登録せず、「未特定」として Runbook に理由を記録してください。
```

### 6.2 特定の施設だけを依頼する例

```text
施設「ゆるまる」だけを対象に、公式と思われるInstagramアカウントURLを
`facilities.instagram_url` に登録してください。

やり方・判断基準は
`docs/instagram-integration/05-instagram-account-search.md` を参照してください。
```

## 7. 参考資料

- [04-runbook.md](./04-runbook.md) - 運用手順書
- [README.md](./README.md) - Instagram連携検討の概要とベストプラクティス
- [02-technical-options.md](./02-technical-options.md) - 技術選択肢の比較（利用規約の整理）

## 8. 実装例（過去の成功事例）

### 9.1 おやこっこなか（中区）

- **検索クエリ**: `おやこっこなか instagram`
- **結果**: 検索結果の最初に `@oyakokko_naka` が表示された
- **登録URL**: `https://www.instagram.com/oyakokko_naka/`
- **判断根拠**: プロフィール説明に「名古屋市中区子育て応援拠点」と明記されていた

### 9.2 ゆるまる（中川区）

- **検索クエリ**: `ゆるまる instagram`
- **結果**: 検索結果の最初に「名古屋市中川区子育て応援拠点ゆるまる ... Instagram · yurumaru_nakagawa 1400 人以上のフォロワー」が表示された
- **登録URL**: `https://www.instagram.com/yurumaru_nakagawa/`
- **判断根拠**: 検索結果のスニペットに施設名と区名が含まれ、フォロワー数も妥当だった

---

**最終更新日**: 2025-11-26（4.3節の手順を明確化）

