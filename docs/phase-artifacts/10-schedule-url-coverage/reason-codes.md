# フェーズ10: 理由コード体系

このドキュメントは、フェーズ10で使用する**理由コードの正本**です。

## コード体系

- **接頭辞**: `S10_`（フェーズ10を表す）
- **形式**: `S10_<カテゴリ>_<詳細>`
- **用途**: 施設×月が「未特定確定」または「対象外」と判定された理由を機械可読に記録する

## コード一覧

### 未特定確定（`S10_NOT_FOUND_*`）

施設×月について、CSE検索を実施したが、スケジュール投稿URLを特定できなかった場合に使用。

| コード | 説明 | 判定条件 |
|--------|------|----------|
| `S10_NOT_FOUND_NO_RESULTS` | CSE検索で候補が0件 | 検索結果が空 |
| `S10_NOT_FOUND_MULTIPLE_CANDIDATES` | 候補が複数あり、自動判定不可 | 候補が2件以上で、どれが正しいか判断できない |
| `S10_NOT_FOUND_INVALID_FORMAT` | 候補はあるが、URL形式が不正 | 候補URLが `instagram.com/(p|reel)/...` 形式でない |
| `S10_NOT_FOUND_WRONG_MONTH` | 候補はあるが、対象月の投稿ではない | 候補の投稿日やキャプションから対象月でないと判断 |

### 対象外（`S10_OUT_OF_SCOPE_*`）

施設×月について、そもそも処理対象外と判定された場合に使用。

| コード | 説明 | 判定条件 |
|--------|------|----------|
| `S10_OUT_OF_SCOPE_NO_INSTAGRAM` | 施設にInstagramアカウントURLが未設定 | `facilities.instagram_url IS NULL` |
| `S10_OUT_OF_SCOPE_ALREADY_REGISTERED` | 既に登録済み（スキップ） | `schedules.instagram_post_url` が妥当形式で既に存在 |
| `S10_OUT_OF_SCOPE_MANUAL_REQUIRED` | 手動確認が必要（MVPでは自動化しない） | 特殊なケースで、自動判定を避けるべきと判断 |

## 使用例

### CLI出力（JSON）

```json
{
  "facility_id": 123,
  "facility_name": "サンプル保育園",
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
```

### 集計クエリ例

```sql
-- 未特定確定の件数を理由コード別に集計
SELECT 
  reason_code,
  COUNT(*) AS count
FROM schedules
WHERE published_month = '2025-02-01'
  AND instagram_post_url IS NULL
  AND reason_code LIKE 'S10_%'
GROUP BY reason_code
ORDER BY count DESC;
```

## 更新履歴

- 2025-12-22: 初版作成（タスク1完了時）

## 関連ドキュメント

- [`docs/05-10-schedule-url-coverage.md`](../../05-10-schedule-url-coverage.md): フェーズ10の進捗管理の正本
- [`task-01-spec.md`](./task-01-spec.md): タスク1で決めた仕様

