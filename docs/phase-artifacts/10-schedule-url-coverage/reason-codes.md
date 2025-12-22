# フェーズ10: 理由コード体系

このドキュメントは、フェーズ10で使用する**理由コードの正本**です。

## コード体系

- **接頭辞**: `S10_`（フェーズ10を表す）
- **形式**: `S10_<カテゴリ>_<詳細>`
- **用途**: 施設×月が「未特定確定」または「対象外」と判定された理由を機械可読に記録する
- **注意**: フェーズ10（MVP）では、**未特定確定/対象外はDBに無理に保存しない**方針（`docs/05-00-development-phases.md` のフェーズ10節）。理由コードは **CLIの出力（JSON/Markdown/CSV）** に必ず含める。

## コード一覧

### 未特定確定（`S10_NOT_FOUND_*`）

施設×月について、CSE検索を実施したが、スケジュール投稿URLを特定できなかった場合に使用。

| コード | 説明 | 判定条件 |
|--------|------|----------|
| `S10_NOT_FOUND_NO_RESULTS` | CSE検索で候補が0件 | 検索結果が空 |
| `S10_NOT_FOUND_MULTIPLE_CANDIDATES` | 候補が複数あり、自動判定不可 | 候補が2件以上で、どれが正しいか判断できない |
| `S10_NOT_FOUND_INVALID_FORMAT` | 候補はあるが、URL形式が不正 | 候補URLが `instagram.com/(p|reel)/...` 形式でない |
| `S10_NOT_FOUND_WRONG_MONTH` | 候補はあるが、対象月の投稿ではない | 候補の投稿日やキャプションから対象月でないと判断 |
| `S10_NOT_FOUND_NOT_MONTHLY_SCHEDULE` | 候補はあるが、月間スケジュールと断定できない | 「スケジュールっぽいが月間スケジュールではない/確信が持てない」 |
| `S10_NOT_FOUND_NEEDS_REVIEW` | 人間レビューが必要で自動採用しない | MVPでは誤採用回避を優先し、判断不能なケースを一律で未特定に倒す |

### 対象外（`S10_OUT_OF_SCOPE_*`）

施設×月について、**Instagramベース（投稿URL permalink）では追えない**等の理由で、MVPの自動取得対象外と判定された場合に使用。

| コード | 説明 | 判定条件 |
|--------|------|----------|
| `S10_OUT_OF_SCOPE_STORY_OR_HIGHLIGHT_ONLY` | ストーリー/ハイライトのみで投稿URLに落ちない | 「ハイライトにあります」等が根拠として取れ、permalink化できない |
| `S10_OUT_OF_SCOPE_ACCOUNT_PRIVATE_OR_UNAVAILABLE` | 非公開/停止/削除などで参照できない | アカウントが private/停止等で、投稿URLの特定が困難 |

> 補足: 対象施設は `facilities.instagram_url IS NOT NULL` を前提とするため、`NO_INSTAGRAM` のような理由コードはフェーズ10では使用しません。

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

### 集計例（JSONから理由コード別に集計）

```bash
# results.json の例（task-01-spec.md の出力スキーマ）を理由コード別に集計する
jq -r '.results[] | select(.status != "registered") | .reason_code' results.json \
  | sort | uniq -c | sort -nr
```

## 更新履歴

- 2025-12-22: 初版作成（タスク1完了時）

## 関連ドキュメント

- [`docs/05-10-schedule-url-coverage.md`](../../05-10-schedule-url-coverage.md): フェーズ10の進捗管理の正本
- [`task-01-spec.md`](./task-01-spec.md): タスク1で決めた仕様

