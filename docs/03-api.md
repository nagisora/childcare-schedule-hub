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
| embed_html | string | ✖ | サニタイズ済み埋め込み HTML（存在する場合） |
| notes | string | ✖ | 運用メモ |

#### API 利用ガイド
- 拠点一覧と最新スケジュールを同時取得する場合は、以下の JOIN クエリを推奨する。
  ```
  /rest/v1/facilities?select=*,schedules(id,published_month,image_url,instagram_post_url,embed_html)&schedules.order=published_month.desc&schedules.limit=1
  ```
- `limit`, `offset`, `order`, `select` の利用規約:
  - `limit`: 1〜50 を許容し、未指定時は 20。
  - `offset`: 0 以上。ページネーション UI は `offset = page * limit` とする。
  - `order`: `order=published_month.desc` のようにカラムと方向を指定。複数指定はカンマ区切り。
  - `select`: 返却フィールドを制御し、不要な列の送信を避ける。

補足（MVP UI での利用範囲）:
- トップページの「拠点一覧」はテキスト表のみのため、`/rest/v1/facilities` の基本フィールド（`name/area/address/phone`）に限定して利用する。
- スケジュール取得（`/rest/v1/schedules`）は「よく使う拠点」エリア（最大5件）および将来の拠点詳細ページでのみ使用し、一覧テーブルでは呼び出さない。

#### FavoriteRecord（ポストMVP）
| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| id | string (UUID) | ✔ | お気に入り ID |
| facility_id | string (UUID) | ✔ | 拠点 ID |
| cookie_id | string | ✔ | 匿名識別子 |
| user_id | string (UUID) | ✖ | 認証ユーザー ID |
| sort_order | number | ✔ | 並び順（昇順） |

### 2.4 Edge Functions（計画）
- `sync-instagram`（ポストMVP）: Instagram 投稿 URL を検証し、画像 URL と oEmbed HTML をキャッシュ。失敗時は監視アラートを送信し、`embed_html` を更新する際は DOMPurify 等でサニタイズする。
- `update-favorites`: 認証済ユーザーの並び順をバッチ更新し、クッキー同期との整合を [01 要件定義](./01-requirements.md) のリスク対応に従って実装。必要に応じて `revalidateTag('facilities')` / `revalidateTag('schedules')` を呼び出す。

### 2.5 JSON Schema / Zod スキーマ
- `packages/shared/schemas/facility.ts`（予定）に Zod スキーマ `Facility`, `FacilityCreate` を定義。
- `packages/shared/schemas/schedule.ts` に `Schedule`, `ScheduleCreate` を定義。
- `packages/shared/schemas/favorite.ts` に `Favorite`, `FavoriteUpsert` を定義。

### 2.6 エラーハンドリング
- REST API から返却する JSON は以下の形式に統一する。
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "schedule not found",
      "details": "facility_id=00000000-0000-0000-0000-000000000000"
    }
  }
  ```
- Supabase REST でエラーが発生した場合は `supabase-js` のエラーオブジェクトをラップし、上記フォーマットに変換する。Edge Function でも例外をキャッチし、`status` を明示的に設定してレスポンスを返す。
- HTTP ステータスコードの対応:

| ステータス | コード例 | 説明 | クライアント側の対応 |
| --- | --- | --- | --- |
| `400 Bad Request` | `VALIDATION_ERROR` | クエリパラメータや body の検証エラー | 入力値を再確認しフォームにエラー表示 |
| `401 Unauthorized` | `UNAUTHENTICATED` | 認証が必要な操作でトークンが無効 | 再ログインを促す |
| `403 Forbidden` | `FORBIDDEN` | 認証済みだが権限が不足 | アクセス不可メッセージを表示 |
| `404 Not Found` | `NOT_FOUND` | 対象データが存在しない | 「データなし」表示にフォールバック |
| `409 Conflict` | `CONFLICT` | 一意制約違反など登録競合 | 再送せずユーザーに通知 |
| `429 Too Many Requests` | `RATE_LIMITED` | レート制限超過 | 再試行までの待機時間を表示 |
| `500 Internal Server Error` | `INTERNAL_ERROR` | 想定外エラー | 監視通知しユーザーにはお詫び表示 |

### 2.7 バージョニングとレート制限
- Supabase REST は `/rest/v1` を基本とし、非互換な変更が必要な場合は `/rest/v2` のように新バージョンを追加する。
- パブリックエンドポイントへのアクセスは IP 単位でレート制限（例: 100 req/10min）を設け、429 発生時には `Retry-After` を返す。

## 3. Instagram Embed API
Instagram 埋め込みは oEmbed を利用してサーバー側で安全に処理する。

### 3.1 認証・前提条件
- エンドポイント: `https://graph.facebook.com/v17.0/instagram_oembed?url={POST_URL}` [[1]](#ref1)
- Facebook アプリのアクセストークンが必要。環境変数は `INSTAGRAM_OEMBED_TOKEN` としてサーバーサイドに保持し、クライアントへ露出させない（[04 開発ガイド](./04-development.md) で設定手順を管理）。
- oEmbed レスポンスから得られた HTML は DOMPurify などでサニタイズし、`iframe` 要素と `script` の読み込み情報を分離して保存する。

### 3.2 表示フロー
1. Supabase の `schedules.instagram_post_url`・`embed_html`・`image_url` を取得する。
2. サーバーコンポーネントまたは Edge Function で oEmbed API を呼び出し、HTML とスクリプトを分離したうえで `embed_html` を保存する。
3. レンダリング時に `InstagramEmbed` コンポーネントで `iframe` を再構築し、`title`・`aria-label`・`loading="lazy"`・`referrerPolicy="no-referrer"` を付与する。
4. `sandbox="allow-scripts allow-same-origin"` を設定し、`next/script` で Instagram SDK (`https://www.instagram.com/embed.js`) を遅延読み込み後 `window.instgrm?.Embeds.process()` を呼び出す。
5. JavaScript 無効時や埋め込み失敗時はスケジュール画像（`image_url`）をフォールバック表示する。

### 3.3 フォールバックと監視
- フォールバックが発生した場合は Supabase のログテーブル（例: `instagram_errors`）に保存し、Slack/Email で通知する。
- 連続エラー発生時は Edge Function 側でリトライポリシーを制御し、必要に応じてキャッシュを無効化する。

## 4. クッキー仕様（MVP）

### 4.1 名称と属性
| 項目 | 値 |
| --- | --- |
| クッキー名 | `csh_favorites` |
| 値の形式 | JSON 文字列（例: `[{"facilityId":"<uuid>","sortOrder":1}]`） |
| 有効期限 | 180 日（`Max-Age=15552000`） |
| 属性 | `SameSite=Lax; Secure; Path=/`（開発環境では `Secure` を除外） |

### 4.2 読み書きフロー
1. 初回アクセス時にクッキーが存在しない場合は匿名 ID を生成し、空の JSON 配列を保存する。
2. お気に入り登録時に `facilityId` と `sortOrder` を追加し、配列サイズは最大 30 件までとする。
3. 並び替え操作で `sortOrder` を更新し、クッキーを書き換える。将来的に Edge Function と同期する際は `update-favorites` を利用する。
4. ポストMVP では認証ユーザーの `favorites` テーブルと同期を取り、クッキーは一時キャッシュとして扱う。

### 4.3 セキュリティ注意
- クッキーには個人情報を含めない。
- 将来的に JWT を利用して DB と同期する際は、`HttpOnly` + `Secure` クッキーを導入し、CSRF 対策を合わせて実装する。

## 5. 将来拡張
- GraphQL / RPC: 複数テーブルをまとめて返す用途に備え、Supabase RPC でカスタムビューを提供する。
- Scheduled Functions: Instagram 自動巡回やキャッシュ更新を定期実行する機能を追加。
- エクスポート API: CSV/JSON ダウンロード用エンドポイント `/api/export` を Next.js 側で提供し、Supabase からのデータ抽出を行う。

## 6. 参考文献
- <a id="ref1"></a>[1] Instagram Embed API ドキュメント, https://developers.facebook.com/docs/instagram/oembed
- <a id="ref2"></a>[2] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref3"></a>[3] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
