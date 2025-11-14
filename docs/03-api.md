# 03 API 仕様

## 1. ドキュメント情報
| 項目 | 内容 |
| --- | --- |
| バージョン | 0.2.0 |
| 最終更新日 | 2025-11-14 |
| 作成責任者 | Childcare Schedule Hub API チーム |
| 対象読者 | バックエンド/フロントエンド開発者、QA、運用担当 |
| 参照元 | [01 要件定義](./01-requirements.md)、[02 設計資料](./02-design.md)、[04 開発ガイド](./04-development.md) |

本書は Supabase REST API と周辺仕様を記述し、設計資料のデータモデルを API 観点で具体化する。更新時は参照元と整合を取ること。

## 2. Supabase REST API
Supabase は PostgreSQL に対して自動生成された REST エンドポイントを提供する。RLS 設定によりアクセス制御を実現し、MVP では匿名読み取り、ポストMVP で認証を導入する。

### 2.1 認証と権限モデル
- **MVP**: 読み取りエンドポイントは API キー不要（`anon` ロール）。書き込み操作は非公開とし、運用者が Supabase Studio で直接実行する。
- **ポストMVP**: Supabase Auth + NextAuth.js による JWT を要求。`service_role` キーはバックエンドの Edge Function のみが使用し、クライアントからは参照しない（[04 開発ガイド](./04-development.md) 参照）。

### 2.2 エンドポイント一覧
| リソース | メソッド | パス | 認証 | 入力（クエリ/ボディ） | 代表レスポンス | エラー |
| --- | --- | --- | --- | --- | --- | --- |
| facilities | GET | `/rest/v1/facilities` | 匿名（MVP） | `select`, `order`, `limit`, `area=eq.{area}` など | 200 + 拠点配列 (`application/json`) | 400 構文エラー、429 レート制限 |
| facilities | POST | `/rest/v1/facilities` | サービスロール（将来） | JSON ボディ（Schema: `FacilityCreate`） | 201 + 作成行 | 401 認証失敗、422 バリデーション |
| schedules | GET | `/rest/v1/schedules` | 匿名（MVP） | `facility_id=eq.{uuid}`, `order=published_month.desc`, `limit` | 200 + スケジュール配列 | 404 該当なし |
| schedules | POST | `/rest/v1/schedules` | サービスロール（将来） | JSON ボディ（Schema: `ScheduleCreate`） | 201 + 作成行 | 401 認証失敗、422 バリデーション |
| favorites | GET | `/rest/v1/favorites?cookie_id=eq.{cookie}` | 匿名（ポストMVP準備） | `cookie_id`, `select` | 200 + お気に入り配列 | 401 認証必要（ポストMVP） |
| favorites | UPSERT | `/rest/v1/favorites` | ユーザー JWT（ポストMVP） | JSON ボディ（Schema: `FavoriteUpsert`） | 200 + 更新行 | 401 認証失敗、409 競合 |

#### レスポンス例: facilities GET
```json
[
  {
    "id": "d8c1bcb9-5f84-4a8a-8d86-3b5b0874d1c0",
    "name": "〇〇子育て応援拠点",
    "area": "中区",
    "address": "名古屋市中区1-1-1",
    "phone": "052-000-0000",
    "instagram_url": "https://www.instagram.com/example",
    "website_url": "https://example.jp",
    "created_at": "2025-10-01T12:00:00+09:00",
    "updated_at": "2025-10-15T09:00:00+09:00"
  }
]
```

#### エラー応答フォーマット
```json
{
  "code": "PGRST300",
  "details": null,
  "hint": null,
  "message": "Invalid input syntax for uuid: \"invalid\""
}
```

### 2.3 入出力スキーマ概要
詳細なフィールド仕様は [02 設計資料](./02-design.md) のテーブル定義を単一ソースとし、API では以下を最小構成として返却する。

#### FacilitySummary（GET `/facilities`）
| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string (UUID) | ✔ | 拠点 ID |
| name | string | ✔ | 拠点名 |
| area | string | ✔ | エリア（区名） |
| address | string | ✔ | 住所 |
| phone | string | ✖ | 電話番号。存在する場合はハイフン含む |
| instagram_url | string | ✖ | Instagram プロフィール URL |
| website_url | string | ✖ | 公式サイト |

#### ScheduleSummary（GET `/schedules`）
| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string (UUID) | ✔ | スケジュール ID |
| facility_id | string (UUID) | ✔ | 拠点 ID |
| image_url | string | ✔ | 公開画像 URL |
| instagram_post_url | string | ✖ | oEmbed 対象の投稿 URL |
| published_month | string (ISO-8601 `YYYY-MM-DD`) | ✔ | 対象月（1 日固定） |
| status | string | ✔ | `published` / `draft` / `archived` |

#### FavoriteRecord（ポストMVP）
| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string (UUID) | ✔ | お気に入り ID |
| facility_id | string (UUID) | ✔ | 拠点 ID |
| cookie_id | string | ✔ | 匿名識別子 |
| user_id | string (UUID) | ✖ | 認証ユーザー ID |
| sort_order | number | ✔ | 並び順（昇順） |

### 2.4 Edge Functions（計画）
- `sync-instagram`（ポストMVP）: Instagram 投稿 URL を検証し、画像 URL と oEmbed HTML をキャッシュ。失敗時は監視アラートを送信。
- `update-favorites`: 認証済ユーザーの並び順をバッチ更新。クッキー同期との整合を [01 要件定義](./01-requirements.md) のリスク対応に従って実装。

### 2.5 JSON Schema / Zod スキーマ
- `packages/shared/schemas/facility.ts`（予定）に Zod スキーマ `Facility`, `FacilityCreate` を定義。
- `packages/shared/schemas/schedule.ts` に `Schedule`, `ScheduleCreate` を定義。
- `packages/shared/schemas/favorite.ts` に `Favorite`, `FavoriteUpsert` を定義。

## 3. Instagram Embed API
Instagram 埋め込みは oEmbed を利用してサーバー側で安全に処理する。

### 3.1 認証・前提条件
- エンドポイント: `https://graph.facebook.com/v17.0/instagram_oembed?url={POST_URL}`。
- Facebook アプリのアクセストークンが必要。環境変数は `INSTAGRAM_OEMBED_TOKEN` としてサーバーサイドに保持し、クライアントへ露出させない（[04 開発ガイド](./04-development.md) で設定手順を管理）。
- TODO: トークンの有効期限と更新手順を調査し、本章に追記する。

### 3.2 表示フロー
1. Supabase の `schedules.instagram_post_url` を取得。
2. サーバーコンポーネントまたは Edge Function で oEmbed API を呼び出し、HTML・スクリプトを分離。
3. レンダリング時に `next/script` で Instagram SDK を遅延読み込みし、iframe を安全に埋め込む。
4. JavaScript 無効時はスケジュール画像（`image_url`）をフォールバック表示する。

### 3.3 エラーハンドリング
- oEmbed 取得失敗時は 503 を返し、Supabase ログテーブル `instagram_errors`（予定）に保存。
- 連続エラーが発生した場合は Edge Function で通知（Slack / Email）を送信。

## 4. クッキー仕様（MVP）

### 4.1 名称と属性
| 項目 | 値 |
| --- | --- |
| クッキー名 | `csh_favorites` |
| 値の形式 | カンマ区切り文字列 `facilityId:sortOrder` |
| 有効期限 | 180 日 |
| 属性 | `SameSite=Lax; Secure; Path=/`（開発環境では `Secure` を除外） |

### 4.2 読み書きフロー
1. 初回アクセス時にクッキーが存在しない場合は匿名 ID を生成。
2. お気に入り登録時に `facilityId` を追記し、クッキーを再発行。
3. 並び替え操作で `sortOrder` を再計算し、サーバーコンポーネントで同期。
4. ポストMVP では認証ユーザーの `favorites` テーブルと同期を取り、クッキーは一時キャッシュとする。

### 4.3 セキュリティ注意
- クッキーには個人情報を含めない。
- 将来的に JWT を利用し DB と同期する際は、`HttpOnly` + `Secure` クッキーを導入し、CSRF 対策を合わせて実装する。

## 5. 将来拡張
- GraphQL / RPC: 複数テーブルをまとめて返す用途に備え、Supabase RPC でカスタムビューを提供する。
- Scheduled Functions: Instagram 自動巡回やキャッシュ更新を定期実行する機能を追加。
- エクスポート API: CSV/JSON ダウンロード用エンドポイント `/api/export` を Next.js 側で提供し、Supabase からのデータ抽出を行う。

## 6. 参考文献
- [Instagram Embed API ドキュメント](https://developers.facebook.com/docs/instagram/oembed)
- Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
