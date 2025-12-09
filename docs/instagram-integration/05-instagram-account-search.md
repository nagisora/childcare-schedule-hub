# 05 InstagramアカウントURL検索指示書

## 1. 目的

- **目的**: `facilities.instagram_url` に、各施設の「公式と思われる Instagram アカウントURL」を登録するための、AI向け検索手順と判断基準を統一すること。
- **想定ユースケース**:
  - 人間がAIに対して、次のように依頼できるようにする:
    - 「中川区のInstagramのURLを取得して。やり方は `docs/instagram-integration/05-instagram-account-search.md` を参照して。」
    - 「○○区の施設のうち、まだ `instagram_url` がNULLのものだけ対象に同じことをやって。」

> **補足（検索APIによる自動化の検討状況）**
>
> 本ドキュメントは、現時点では **ブラウザでGoogle検索を開く手順** を前提とした指示書である。
> 一方で、`instagram-integration/ai-comparisons/` フォルダでは、Google Custom Search API / Serper.dev / DuckDuckGo Search などの**検索APIを使ってURL特定を自動化する案**を検討している。
> 将来的に検索API版のワークフローが標準化された場合は、本指示書の内容を「検索API版」の手順に更新する予定。

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
- **効率的な検索順序**: 以下の順序で検索クエリを試す（最初にヒットした時点で次へ進む）:
  1. **最優先**: `site:instagram.com "<施設名>"` （Instagram内を直接検索）
  2. `"<施設名>" instagram`
  3. `"<施設名>" 名古屋 <区名> instagram`
  4. 例（ゆるまる・中川区の場合）:
     - `site:instagram.com "ゆるまる"`
     - `ゆるまる instagram`
     - `ゆるまる 名古屋 中川区 instagram`
- **検索実行方法**:
  - ブラウザツールで検索URLを直接開く方が効率的: `https://www.google.com/search?q=<URLエンコードされた検索クエリ>`
  - 例: `https://www.google.com/search?q=site%3Ainstagram.com+%22%E3%82%86%E3%82%8B%E3%81%BE%E3%82%8B%22`
  - 検索結果ページが表示されたら、スナップショットを取得して確認する。
- **URLエンコードのヒント**:
  - 日本語の施設名は自動的にURLエンコードされるため、ブラウザツールの `browser_navigate` で直接URLを指定する場合は、日本語をそのまま含めても問題ない（ブラウザが自動エンコードする）。
  - または、検索クエリを `encodeURIComponent()` でエンコードしてからURLに含める。

### 4.3 検索結果から候補を絞り込む（効率化版）

- **時間短縮の重要ポイント**:
  - ⚡ **スナップショットファイルを読み取る必要はない**: `browser_snapshot` の結果（YAML構造）から直接情報を抽出する。
  - ⚡ **検索結果のスニペットで判断**: スニペットにアカウント名や施設情報が含まれていれば、Instagramページへの移動を省略できる。
  - ⚡ **`site:instagram.com` 検索を優先**: より直接的にInstagramの結果を取得できる。
- **基本方針**: 検索結果のスニペット（説明文）から直接判断できる場合は、Instagramページに移動する必要はない。
- **効率的な手順**:
  1. **スナップショットから直接情報を取得**:
     - ブラウザのスナップショット（`browser_snapshot`）から、検索結果のリンク要素を確認する。
     - スナップショットファイルを読み取る必要はなく、スナップショットのYAML構造から直接情報を抽出する。
  2. **検索結果スニペットから判断**:
     - 検索結果のスニペット（説明文）に以下の情報が含まれていれば、その時点で判断可能:
       - 施設名（例: ゆるまる、フレンズあおぞら）
       - エリア情報（例: 名古屋市中川区）
       - 子育て応援拠点 / 地域子育て支援拠点 である旨
       - Instagramアカウント名（例: `@yurumaru_nakagawa`、`hikari_kodomoen`）
     - スニペットに `instagram.com/...` のURLが含まれている場合は、それを直接採用する。
     - スニペットにアカウント名（`@` マーク付き）が含まれている場合は、`https://www.instagram.com/<アカウント名>/` を構築する。
     - **重要**: スニペットのアカウント名が途中で分割されて表示される場合がある（例: 「maihau u_dongurihiroba」→ 実際は `maihausu_dongurihiroba`）。アカウント名を抽出する際は、**リンクをクリックして実際のURL（`pageState.url`）を確認する**か、リンク要素のURL属性を確認すること。推測でURLを構築しない。
  3. **リンクのURLを確認する場合**:
     - スニペットだけでは判断できない場合のみ、リンクをクリックしてInstagramページに移動する。
     - リンクをクリック後、URL（`pageState.url`）が `https://www.instagram.com/...` であることを確認する。
     - プロフィールページのタイトルや説明文から、施設との関連性を確認する。
- **公式と思われる候補の判断基準**:
  - **検索結果の上位**に現れる `instagram.com/...` ドメインへのリンクを優先する。
  - 検索結果のスニペットまたはプロフィールに以下が含まれている:
    - 施設名（完全一致または部分一致）
    - エリア情報（名古屋市、区名など）
    - 子育て応援拠点 / 地域子育て支援拠点 である旨
  - 投稿内容が子育て拠点としての活動内容になっている。
- **除外すべきパターン（公式とはみなさない）**:
  - タレント・YouTuber・番組キャラクターなど、施設と無関係な個人アカウント。
  - 治療院・ヨガ講師・物販ブランドなど、名称は似ていても住所・説明が明らかに異なるもの。
- **効率化のポイント**:
  - スナップショットファイルを読み取る必要はない。`browser_snapshot` の結果から直接情報を抽出する。
  - 検索結果のスニペットで判断できる場合は、Instagramページへの移動を省略する。
  - `site:instagram.com` 検索を使うことで、より直接的にInstagramの結果を取得できる。

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

### 8.1 おやこっこなか（中区）

- **検索クエリ**: `おやこっこなか instagram`
- **結果**: 検索結果の最初に `@oyakokko_naka` が表示された
- **登録URL**: `https://www.instagram.com/oyakokko_naka/`
- **判断根拠**: プロフィール説明に「名古屋市中区子育て応援拠点」と明記されていた

### 8.2 ゆるまる（中川区）

- **検索クエリ**: `ゆるまる instagram`
- **結果**: 検索結果の最初に「名古屋市中川区子育て応援拠点ゆるまる ... Instagram · yurumaru_nakagawa 1400 人以上のフォロワー」が表示された
- **登録URL**: `https://www.instagram.com/yurumaru_nakagawa/`
- **判断根拠**: 検索結果のスニペットに施設名と区名が含まれ、フォロワー数も妥当だった

### 8.3 フレンズあおぞら（中川区）

- **検索クエリ**: `フレンズあおぞら instagram`
- **結果**: 検索結果に「【フレンズあおぞら】 就園前のお子さんが遊ぶことができる ... Instagram · hikari_kodomoen」が表示された
- **登録URL**: `https://www.instagram.com/hikari_kodomoen/`
- **判断根拠**: 
  - 検索結果のスニペットに「フレンズあおぞら」と施設名が含まれていた
  - アカウント名 `hikari_kodomoen` が検索結果から直接確認できた
  - 施設は「あおぞらこどもえん内」にあり、同じアカウントで「あおぞらこどもえん」も投稿されていたため、公式アカウントとして適切と判断
- **効率化のポイント**: 検索結果のスニペットから直接アカウント名を特定できたため、Instagramページへの移動を省略してURLを構築できた

### 8.4 マイハウス（中川区）

- **検索クエリ**: `site:instagram.com マイハウス`
- **結果**: 検索結果に「名古屋市地域子育て支援拠点マイハウス☆どんぐり広場 ... Instagram · maihau u_dongurihiroba」が表示された
- **登録URL**: `https://www.instagram.com/maihausu_dongurihiroba/`
- **判断根拠**: 
  - 検索結果のスニペットに「名古屋市地域子育て支援拠点マイハウス」と施設名が含まれていた
  - 施設名「マイハウス」と「名古屋市地域子育て支援拠点」が含まれており、公式アカウントとして適切と判断
- **教訓**: 
  - スニペットでは「maihau u_dongurihiroba」と表示されていたが、実際のアカウント名は `maihausu_dongurihiroba` だった
  - スニペットのアカウント名が途中で分割されて表示される場合があるため、**リンクをクリックして実際のURLを確認する**か、リンク要素のURL属性を確認することが重要
  - 推測でURLを構築すると誤りが発生する可能性がある

---

**最終更新日**: 2025-11-26（アカウント名抽出時の注意点を追加: スニペットの表示が分割される場合があるため、リンクURLの確認を推奨）

