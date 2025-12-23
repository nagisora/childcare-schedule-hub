# タスク2: 投稿URL候補検索（Google CSE）の設計仕様

このドキュメントは、タスク2で確定した**投稿URL候補検索（Google CSE）の設計仕様**の正本です。

## 1. 入力パラメータ

- `facilityName`（必須）: 施設名
- `wardName`（任意）: 区名
- `instagramUsername`（任意）: Instagramユーザー名（`instagramUrl` から抽出可）
- `month`（必須）: 対象月（`YYYY-MM` 形式、例: `2025-12`）

## 2. CSEクエリ生成仕様

### 2.1 月ヒントの定義（対象月の表記パターン）

- `"YYYY年MM月"`（例: `"2025年12月"`）
- `"YYYY/MM"`（例: `"2025/12"`）
- `"YYYY.MM"`（例: `"2025.12"`）
- `"MM月"`（例: `"12月"`）
- `"MM月予定"`（例: `"12月予定"`）
- `"MM月の予定"`（例: `"12月の予定"`）
- `"MM月スケジュール"`（例: `"12月スケジュール"`）
- `"月間スケジュール"`

### 2.2 クエリ生成の優先順位（最大4本まで）

#### `instagramUsername` ありの場合（最優先）

1. クエリ1: `site:instagram.com (inurl:/p/ OR inurl:/reel/) "<username>" ("YYYY年MM月" OR "MM月" OR "MM月の予定" OR "月間スケジュール")`
2. クエリ2: `site:instagram.com (inurl:/p/ OR inurl:/reel/) "<username>" "<facilityName>" ("MM月" OR "月間スケジュール")`
3. クエリ3: `site:instagram.com (inurl:/p/ OR inurl:/reel/) "<username>" "<wardName>" ("MM月" OR "月間スケジュール")`（`wardName` がある場合のみ）

#### `instagramUsername` なしの場合（施設名中心）

1. クエリ1: `site:instagram.com (inurl:/p/ OR inurl:/reel/) "<facilityName>" "<wardName>" ("MM月" OR "月間スケジュール")`（`wardName` がある場合）
2. クエリ2: `site:instagram.com (inurl:/p/ OR inurl:/reel/) "<facilityName>" ("MM月" OR "月間スケジュール")`
3. クエリ3: `site:instagram.com (inurl:/p/ OR inurl:/reel/) "<facilityName>" "<wardName>" 子育て拠点`（`wardName` がある場合、月ヒントなしのフォールバック）
4. クエリ4: `site:instagram.com (inurl:/p/ OR inurl:/reel/) "<facilityName>" 子育て拠点`（月ヒントなしのフォールバック）

### 2.3 注意点

- クエリが長くなりすぎないよう、月ヒントのORは最大4パターンまで
- `site:` と `inurl:` を併用して投稿URL（`/p/` と `/reel/`）に絞る（precision優先）
- 施設名が短い（3文字以下）または一般名詞寄りの場合は、`wardName` や `子育て拠点` を優先的に含める

## 3. 候補URL抽出仕様

### 3.1 入力

CSE API の `items[].link`（`title` と `snippet` も後段の月ヒント判定に利用）

### 3.2 許可URL（抽出対象）

- `https://www.instagram.com/p/<shortcode>/`
- `https://www.instagram.com/reel/<shortcode>/`

### 3.3 除外URL（抽出しない）

- プロフィールURL（`/<username>/`）
- `explore`, `accounts`, `stories`, `reels`（一覧系）, `share`, `login` 等
- クエリパラメータ/フラグメント付きの共有リンクは正規化で除去したうえで、上記許可形式に合致しない場合は除外

### 3.4 正規化（canonical化）

- `http` → `https` に統一
- `m.instagram.com` → `www.instagram.com` に統一
- クエリパラメータ（`?` 以降）を除去
- フラグメント（`#` 以降）を除去
- 末尾に `/` を付与（統一）

### 3.5 重複排除

- canonical URL をキーに dedup（同じURLが複数クエリで出てきても1件のみ）

### 3.6 優先順位

- 同数なら `/p/` を先頭に並べる（ただし複数候補がある場合は自動採用しない）
- `/reel/` は候補として抽出するが **自動採用対象外**（常に要レビュー/未特定へ）

### 3.7 最大候補数

- 上位 `N=10` までを抽出（精度とログ可読性のバランス）

## 4. 採用/未特定/対象外の判定ルール

### 4.1 月ヒント判定（自動採用の必須条件）

- `title` または `snippet` に「対象月」の表記が含まれる（上記「月ヒントの定義」のいずれかにマッチ）
- 月ヒントが取れない候補は **自動採用しない**（precision最優先）

### 4.2 判定フロー（`task-01-spec.md` の 4) を踏襲）

1. **候補0件** → `S10_NOT_FOUND_NO_RESULTS`

2. **候補1件の場合**:
   - `/p/` かつ 月ヒントあり → **自動採用**（登録済みとして `schedules` に反映）
   - `/p/` だが 月ヒントなし → `S10_NOT_FOUND_NOT_MONTHLY_SCHEDULE`
   - `/reel/` → `S10_NOT_FOUND_NEEDS_REVIEW`（`/reel/` は自動採用しない方針）

3. **候補2件以上** → `S10_NOT_FOUND_MULTIPLE_CANDIDATES`（月ヒントで絞れそうでもMVPは未特定へ倒す）

4. **候補はあるが形式不正のみ** → `S10_NOT_FOUND_INVALID_FORMAT`

5. **「ハイライト/ストーリーのみ」が根拠として取れる場合**:
   - snippet に「ハイライト」「ストーリー」等が明確に含まれ、permalink 候補が取れない → `S10_OUT_OF_SCOPE_STORY_OR_HIGHLIGHT_ONLY`

### 4.3 判定の優先順位

- 上記の順序で判定し、最初に該当した理由コードを採用
- 迷う場合は常に「未特定」へ倒す（誤採用回避を最優先）

## 5. 設計メモ（重要）

- **ピン留め/固定投稿の考慮**: スケジュール投稿が固定されている施設があるため、検索結果で上位に出やすい。ただし「固定だから」という理由だけで採用せず、**対象月の月間スケジュール**だと根拠が取れる場合のみ採用する
- **ハイライトの扱い**: 「スケジュールがハイライトにある」ケースは、MVPでは投稿URL（permalink）に落とし込めないことがある。その場合は **対象外**として `S10_OUT_OF_SCOPE_STORY_OR_HIGHLIGHT_ONLY` で一覧化し、状況メモ（notes等）を残す
- **フォールバック（半自動）**: 自動採用が難しい場合は、最新投稿から一定件数まで遡る等で候補を追加提示し、最終判断は未特定に倒す（MVPは誤採用回避を優先し、スクレイピング前提の自動巡回は避ける）
- **推奨調査順（手動レビュー前提）**: **ピン留め（固定投稿）→ハイライト→Google CSE**（ただし、固定/ハイライトであっても「対象月の月間スケジュール」だと根拠が取れない場合は採用しない）
- **推奨調査順（MVPの自動処理/CLI前提）**: Instagramの自動巡回は避けるため **Google CSE →（判断不能なら）未特定に倒す** を基本とし、ハイライトのみ等が「根拠として取れる」場合に限って対象外に分類する

## 6. 更新履歴

- 2025-12-23: 初版作成（タスク2完了時）

## 関連ドキュメント

- [`docs/05-10-schedule-url-coverage.md`](../../05-10-schedule-url-coverage.md): フェーズ10の進捗管理の正本
- [`task-01-spec.md`](./task-01-spec.md): タスク1で決めた仕様（対象月・分類・理由コード）
- [`reason-codes.md`](./reason-codes.md): 理由コード体系の詳細

