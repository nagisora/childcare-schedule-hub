# タスク1: 取得仕様の確定

このドキュメントは、タスク1で確定した**取得仕様（対象月・判定・理由コード）**の正本です。

## 1. 対象施設・対象月

### 対象施設

- **条件**: `facilities.instagram_url IS NOT NULL`
- **理由**: InstagramアカウントURLが設定されている施設のみを対象とする（フェーズ9で設定済み）

### 対象月

- **基準**: 「現在月」（`Asia/Tokyo` タイムゾーン固定）
- **正規化**: DBでは必ず「月の1日」に統一（例: `2025-02-01`）
- **CLI入力**: `--month YYYY-MM` 形式を許可（例: `--month 2025-02`）
  - 未指定の場合は「現在月」を使用
  - 入力された月は自動的に `YYYY-MM-01` に正規化

### タイムゾーン処理

- **サーバー/CI環境**: UTCでもブレないよう、`Asia/Tokyo` で「現在月」を判定
- **実装例**: 
  ```typescript
  const now = new Date();
  const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const currentMonth = `${jstDate.getFullYear()}-${String(jstDate.getMonth() + 1).padStart(2, '0')}-01`;
  ```

## 2. 分類と判定基準

施設×月は、以下のいずれかに分類される（**処理済み**の定義: 必ずどれかに分類されること）。

### 2.1 登録済み

- **判定条件**: 
  - `schedules.instagram_post_url` が**妥当形式**で入っている
  - 妥当形式: `https://(www.)?instagram.com/(p|reel)/[A-Za-z0-9_-]+/`（クエリパラメータ/フラグメントなし）
- **処理**: 既存レコードをスキップ（再検索しない）
- **null/形式不正の扱い**: **未処理扱い**（再検索対象）

### 2.2 未特定確定

- **判定条件**: CSE検索を実施したが、スケジュール投稿URLを特定できなかった
- **理由コード**: `S10_NOT_FOUND_*` 系（詳細は [`reason-codes.md`](./reason-codes.md) を参照）
- **処理**: `schedules` には登録せず、理由コード付きで一覧化（JSON/Markdown出力）

### 2.3 対象外

- **判定条件**: そもそも処理対象外
- **理由コード**: `S10_OUT_OF_SCOPE_*` 系（詳細は [`reason-codes.md`](./reason-codes.md) を参照）
- **処理**: `schedules` には登録せず、理由コード付きで一覧化

## 3. 判定フロー（処理順序）

```
1. 対象施設の抽出（instagram_url IS NOT NULL）
   ↓
2. 対象月の正規化（YYYY-MM-01）
   ↓
3. 既存レコードの確認
   ├─ 登録済み（妥当形式） → スキップ（登録済み）
   └─ 未登録 or 形式不正 → 次へ
   ↓
4. CSE検索の実施
   ├─ 候補0件 → 未特定確定（S10_NOT_FOUND_NO_RESULTS）
   ├─ 候補1件（妥当形式） → 自動採用（登録済み）
   ├─ 候補複数件 → 未特定確定（S10_NOT_FOUND_MULTIPLE_CANDIDATES）
   └─ 候補あり（形式不正） → 未特定確定（S10_NOT_FOUND_INVALID_FORMAT）
   ↓
5. 出力（JSON/Markdown）
   - 登録済み: schedules に反映
   - 未特定確定/対象外: 一覧化（理由コード付き）
```

## 4. 理由コード体系

詳細は [`reason-codes.md`](./reason-codes.md) を参照。

- **接頭辞**: `S10_`
- **カテゴリ**: `NOT_FOUND_*`（未特定確定）、`OUT_OF_SCOPE_*`（対象外）

## 5. 出力スキーマ（CLI出力）

### JSON形式

```json
{
  "summary": {
    "total_facilities": 65,
    "processed": 65,
    "registered": 30,
    "not_found": 25,
    "out_of_scope": 10
  },
  "results": [
    {
      "facility_id": 123,
      "facility_name": "サンプル保育園",
      "ward_name": "中区",
      "published_month": "2025-02-01",
      "status": "registered",
      "instagram_post_url": "https://www.instagram.com/p/ABC123/"
    },
    {
      "facility_id": 456,
      "facility_name": "別の保育園",
      "ward_name": "東区",
      "published_month": "2025-02-01",
      "status": "not_found",
      "reason_code": "S10_NOT_FOUND_MULTIPLE_CANDIDATES",
      "reason_description": "候補が3件あり、自動判定不可",
      "candidates": [
        "https://www.instagram.com/p/ABC123/",
        "https://www.instagram.com/p/DEF456/",
        "https://www.instagram.com/p/GHI789/"
      ]
    }
  ]
}
```

### Markdown形式（要約）

```markdown
# スケジュールURLカバレッジ結果

## サマリ
- 対象施設数: 65
- 登録済み: 30
- 未特定確定: 25
- 対象外: 10

## 未特定確定一覧
...
```

## 6. データ品質要件

- **`published_month`**: 必ず「月の1日」で統一（例: `2025-02-01`）
- **`instagram_post_url`**: 妥当形式のみ許可（クエリパラメータ/フラグメントなし）
- **ユニーク制約**: `(facility_id, published_month)` は1件に収束（UPSERT方針）
- **処理済みの定義**: 対象施設×対象月が必ず「登録済み / 未特定確定 / 対象外」のいずれかに分類される

## 7. 更新履歴

- 2025-12-22: 初版作成（タスク1完了時）

## 関連ドキュメント

- [`docs/05-10-schedule-url-coverage.md`](../../05-10-schedule-url-coverage.md): フェーズ10の進捗管理の正本
- [`reason-codes.md`](./reason-codes.md): 理由コード体系の詳細

