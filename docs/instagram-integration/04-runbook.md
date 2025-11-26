# 04 運用手順書

## 概要

Instagram連携によるスケジュールURL取得・管理の運用手順をまとめる。

**注意**: 本ドキュメントは確定後に `docs/04-development.md` 9.6節へ転記予定。

---

## 手動入力フロー

### 前提条件

- Supabase プロジェクトが作成済み
- `facilities` テーブルに施設データが登録済み
- `schedules` テーブルが作成済み（[02 設計資料](../02-design.md) 3.3節参照）

### 手順

#### 1. InstagramアカウントURLの確認

**方法A: 自治体サイトから確認**
- **結果**: 名古屋市サイト（一覧ページ・詳細ページ）にはInstagramリンクが含まれていないため、この方法は使用不可
- **代替方法**: 手動でWeb検索・Instagram検索を実施

**方法B: 手動でWeb検索・Instagram検索を実施**（推奨）
1. 施設名を確認（`facilities` テーブルから取得、または名古屋市サイトから確認）
2. 検索エンジンで以下のキーワードで検索:
   - `"施設名" Instagram`
   - `"施設名" 子育て Instagram`
   - `"施設名" 名古屋 Instagram`
3. InstagramアプリまたはWebで、施設名を直接検索
4. 見つかったアカウントが該当施設のものか確認（プロフィールの説明・投稿内容を確認）
5. アカウントURLを控える（例: `https://www.instagram.com/account_name/`）

**方法C: スクレイピングスクリプトで取得**
- **結果**: 名古屋市サイトにInstagramリンクが含まれていないため、この方法は使用不可
- **将来の拡張**: 名古屋市サイトが更新され、Instagramリンクが追加された場合に検討

#### 2. スケジュールURLの確認

1. Instagramアカウントにアクセス（`facilities.instagram_url` に登録されたURL、または手動で検索）
2. 月間スケジュールの投稿を探す:
   - 最新の投稿を確認（通常、月初めに投稿されることが多い）
   - 固定投稿（ピン留め）を確認
   - ハッシュタグ（例: `#月間スケジュール`, `#スケジュール`）で検索
3. スケジュールURLを特定:
   - **パターン1: キャプション内にURL**
     - 投稿のキャプションに、Googleドライブや自治体サイトのURLが記載されている
     - 例: 「今月のスケジュールはこちら: https://drive.google.com/...」
   - **パターン2: プロフィールリンク**
     - プロフィールの「リンク」欄に、月間スケジュールへのリンク（linktree等）が設定されている
   - **パターン3: 画像そのもの**
     - スケジュールが画像として投稿されている（PDFや画像ファイル）
     - この場合、投稿URL自体を `instagram_post_url` に登録し、oEmbedで埋め込み表示
   - **パターン4: 固定投稿（ピン留め）**
     - 月間スケジュールの投稿がピン留めされている
     - 投稿URLを `instagram_post_url` に登録
4. スケジュールURLを控える:
   - Instagram投稿URL: `https://www.instagram.com/p/...`
   - 外部サイトURL（Googleドライブ等）: `https://drive.google.com/...` など

#### 3. schedulesテーブルへの登録

**Supabase Studio での操作**:
1. Supabase プロジェクトのダッシュボードにアクセス
2. Table Editor > `schedules` テーブルを開く
3. **Insert** > **Insert row** をクリック
4. 以下の項目を入力:
   - `facility_id`: 対象施設のUUID（`facilities` テーブルから取得）
   - `instagram_post_url`: Instagram投稿URL（例: `https://www.instagram.com/p/...`）
     - 外部サイトURL（Googleドライブ等）の場合は、`image_url` に登録することを検討（将来拡張）
   - `published_month`: 対象月の1日（例: `2025-01-01`）
     - 注意: 月の1日で統一する（例: 1月なら `2025-01-01`、2月なら `2025-02-01`）
   - `status`: `published`
5. **Save** をクリック
6. エラーが出た場合:
   - `UNIQUE constraint` エラー: 既に同じ `(facility_id, published_month)` の組み合わせが存在する
     - 既存レコードを更新するか、別の月として登録する
   - バリデーションエラー: `published_month` が月の1日でない可能性がある

**SQLでの操作**:
```sql
-- 新規登録
INSERT INTO schedules (facility_id, instagram_post_url, published_month, status)
VALUES (
  'facility-uuid-here',  -- facilities テーブルから取得したUUID
  'https://www.instagram.com/p/...',  -- Instagram投稿URL
  '2025-01-01',  -- 対象月の1日
  'published'
);

-- 既存レコードの更新（同じ facility_id, published_month の組み合わせが既に存在する場合）
UPDATE schedules
SET instagram_post_url = 'https://www.instagram.com/p/...',
    status = 'published'
WHERE facility_id = 'facility-uuid-here'
  AND published_month = '2025-01-01';
```

---

## データ投入手順

### バッチ投入（複数施設）

**現時点では非推奨**:
- MVPでは個別投入を基本とする
- 将来的に、複数施設のスケジュールを一度に登録する必要が出た場合に検討
- バッチ投入の場合は、CSVインポートやSQLスクリプトを検討

### 個別投入（推奨）

**手順**:
1. 上記「手動入力フロー」の手順に従い、1施設ずつ登録
2. 登録後、Webアプリで表示を確認（必要に応じて）
3. 次の施設に進む

**注意点**:
- すべての施設で埋まっていなくてもOK（部分的な対応で可）
- 優先度の高い施設から順に登録することを推奨

---

## 更新・メンテナンス

### 定期更新

**更新頻度**: 月1回程度を目安とする
- 各施設の月間スケジュールが更新されるタイミングに合わせて更新
- すべての施設で同時に更新する必要はなく、更新された施設のみ更新すればOK
- 月初め（1日〜5日頃）に確認・更新することを推奨

**更新手順**:
1. 対象月のスケジュールが更新されているか確認:
   - 各施設のInstagramアカウントを確認
   - 新しい月間スケジュールの投稿を探す
2. 新しいスケジュールURLを特定（上記「2. スケジュールURLの確認」を参照）
3. `schedules` テーブルを更新:
   - 既存レコードがある場合: `UPDATE` で `instagram_post_url` を更新
   - 既存レコードがない場合: `INSERT` で新規登録
4. 更新日時を記録（将来的に `last_updated_at` カラムを追加予定）

### エラー対応

**埋め込み表示が失敗する場合**:
1. **oEmbed APIのエラーを確認**:
   - Instagram投稿URLが正しいか確認（`https://www.instagram.com/p/...` 形式）
   - 投稿が削除されていないか確認（Instagramアプリで直接確認）
   - 投稿が非公開になっていないか確認
2. **レート制限の可能性**:
   - `INSTAGRAM_OEMBED_TOKEN` が設定されているか確認
   - レート制限に達している場合は、時間を置いてから再試行
3. **フォールバック表示**:
   - `schedules.image_url` に代替画像URLが登録されている場合、そちらを表示
   - または、Instagram投稿URLを直接リンクとして表示

**投稿URLが無効になった場合**:
1. **原因の確認**:
   - 投稿が削除された
   - アカウントが非公開になった
   - URLが変更された
2. **対処方法**:
   - Instagramアカウントを確認し、新しい投稿URLを取得
   - `schedules` テーブルを更新（`UPDATE` で `instagram_post_url` を更新）
   - 新しい投稿が見つからない場合は、`status` を `archived` に変更（将来拡張）

---

## 確認・検証

### データ整合性チェック

**登録データの確認方法**:
1. **Supabase Studio での確認**:
   - Table Editor > `schedules` テーブルを開く
   - 登録されたレコードを確認:
     - `facility_id` が正しいか（`facilities` テーブルと照合）
     - `instagram_post_url` が有効なURLか
     - `published_month` が月の1日か（例: `2025-01-01`）
     - `status` が `published` か
2. **SQLでの確認**:
   ```sql
   -- 特定の施設のスケジュールを確認
   SELECT s.*, f.name as facility_name
   FROM schedules s
   JOIN facilities f ON s.facility_id = f.id
   WHERE f.id = 'facility-uuid-here'
   ORDER BY s.published_month DESC;

   -- 重複チェック
   SELECT facility_id, published_month, COUNT(*) as count
   FROM schedules
   GROUP BY facility_id, published_month
   HAVING COUNT(*) > 1;
   ```

### 表示確認

**Webアプリでの表示確認方法**:
1. ローカル開発サーバーを起動: `mise exec -- pnpm --filter web dev`
2. 対象施設の詳細ページにアクセス
3. スケジュールセクションを確認:
   - Instagram投稿が埋め込み表示されているか
   - 投稿URLが正しく表示されているか
   - エラーメッセージが表示されていないか
4. エラーが表示される場合:
   - ブラウザの開発者ツール（F12）でコンソールエラーを確認
   - ネットワークタブでoEmbed APIのリクエストを確認
   - 上記「エラー対応」を参照

---

## トラブルシューティング

### よくある問題

| 問題 | 原因 | 対処方法 |
|------|------|----------|
| `UNIQUE constraint` エラーが発生する | 既に同じ `(facility_id, published_month)` の組み合わせが存在する | 既存レコードを `UPDATE` で更新するか、別の月として登録する |
| `published_month` のバリデーションエラー | 月の1日でない日付が入力されている | 月の1日に修正（例: `2025-01-15` → `2025-01-01`） |
| Instagram投稿が埋め込み表示されない | oEmbed APIのエラー、レート制限、投稿が削除された | 上記「エラー対応」を参照 |
| 施設のInstagramアカウントが見つからない | 名古屋市サイトにInstagramリンクが含まれていない | 手動でWeb検索・Instagram検索を実施（上記「1. InstagramアカウントURLの確認」を参照） |
| スケジュールURLが特定できない | 投稿形式が想定と異なる（画像のみ、プロフィールリンク等） | 投稿形式に応じて対応（上記「2. スケジュールURLの確認」を参照） |

---

## 参考資料

- [02 設計資料](../02-design.md) - schedulesテーブル定義
- [03 API 仕様](../03-api.md) - Instagram Embed API仕様
- [04 開発ガイド](../04-development.md) - スクレイピングガイドライン、Instagram連携フロー（9.6節）

## 04-development.md への統合

本ドキュメントの内容は、確定後に [`docs/04-development.md`](../04-development.md) の 9.6節「Instagram連携によるスケジュールURL取得・更新フロー（フェーズ6）」として統合済み。

統合日: 2025-01-22

## 実データ登録の記録

### 登録実施例

**注意**: 実際のInstagramアカウントを探してデータを登録する際は、以下の手順に従い、登録結果と気づきを記録する。

**登録手順**:
1. サンプル施設を選定（優先度の高い施設から）
2. 上記「手動入力フロー」に従い、InstagramアカウントURLを確認・登録
3. スケジュールURLを確認・登録
4. 登録結果と気づきを以下に記録

**登録記録**（実際に登録した場合は以下に追記）:

| 施設名 | InstagramアカウントURL | 投稿形式 | スケジュールURL | 登録日 | 備考 |
|--------|----------------------|---------|----------------|--------|------|
| おやこっこなか | https://www.instagram.com/oyakokko_naka/ | 未確認 | 未確認 | 2025-11-26 | Google検索「おやこっこなか instagram」で即座に見つかった。アカウント名: @oyakokko_naka、フォロワー1150人以上 |

**気づき・注意点**（実際に登録した際の気づきを記録）:
- **検索実施内容**:
  - 最初の試行: Cursor Autoモードで`web_search`ツールを使用し、複数の検索クエリを試したが、正確な結果が得られなかった
  - 検索クエリ: `"おやこっこなか" インスタグラム`, `"おやこっこなか" 名古屋 中区 Instagram`, `"おやこっこなか" 子育て 支援`, `site:instagram.com おやこっこなか`, `名古屋市 中区 子育て支援センター Instagram`, `"おやこっこなか" OR "oyakokko naka" Instagram`
  - **最終的に成功した検索**: Google検索で「おやこっこなか instagram」と検索したところ、即座に公式アカウントが見つかった
- **問題点と改善点**:
  - `web_search`ツールの結果が不正確だった可能性: AIが生成した要約が実際の検索結果と異なっていた
  - ブラウザツールでGoogle検索を試したが、reCAPTCHAでブロックされた
  - **最もシンプルなクエリ「おやこっこなか instagram」が最も効果的だった**が、ツールでは見つけられなかった
  - 今後の改善案: 可能であれば、実際のGoogle検索結果を直接確認する方法を検討する（reCAPTCHA回避策や、別の検索エンジンの利用など）
- **確認できた情報**:
  - アカウント名: `@oyakokko_naka`
  - URL: `https://www.instagram.com/oyakokko_naka/`
  - フォロワー: 1150人以上
  - 説明: 「名古屋市中区子育て応援拠点です。(錦3丁目2-32 錦アクシスビル2F TEL0522288464) 月火水金土(祝日休み) の9~15時に0~3歳の未就園児の親子&プレママプレパパを対象に子育て...」
  - 投稿数: 332投稿
  - フォロー中: 76アカウント

