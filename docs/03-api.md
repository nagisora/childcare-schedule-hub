# 03 API 仕様

## 1. Supabase API
Supabase は PostgreSQL をベースとした BaaS であり、自動生成される REST API と Edge Functions を利用する。

### 1.1 認証
- MVP では匿名公開読み取りを許可（RLS で制御）。
- 将来は JWT（Supabase Auth + NextAuth.js）による保護を追加。

### 1.2 エンドポイント
| リソース | メソッド | パス | 概要 |
| --- | --- | --- | --- |
| facilities | GET | `/rest/v1/facilities` | 拠点一覧取得（`select=id,name,area,address,phone,instagram_url,website_url`） |
| facilities | POST | `/rest/v1/facilities` | 管理者による拠点登録（将来） |
| schedules | GET | `/rest/v1/schedules?facility_id=eq.{id}&order=created_at.desc&limit=1` | 最新スケジュール取得 |
| schedules | POST | `/rest/v1/schedules` | 管理者によるスケジュール登録（将来） |
| favorites | GET | `/rest/v1/favorites?cookie_id=eq.{cookie}` | お気に入り取得（MVP では未使用） |
| favorites | UPSERT | `/rest/v1/favorites` | お気に入り登録/並び順更新（将来） |

- N+1問題を防ぐため、拠点一覧と最新スケジュールは以下のように JOIN して取得する。
  ```
  /rest/v1/facilities?select=*,schedules(id,month,image_url,post_url,embed_html)&schedules.order=created_at.desc&schedules.limit=1
  ```
- スケジュールが存在しない拠点も一覧に表示する場合は上記のようにデフォルトの left join を用いる。最新スケジュールを必須としたい場合のみ `!inner` を付与する。
- `limit`, `offset`, `order`, `select`（`fields` に相当）の利用規約:
  - `limit`: 1〜50 を許容し、未指定時は 20。
  - `offset`: 0 以上。ページネーション UI は `offset = page * limit` とする。
  - `order`: `order=created_at.desc` のようにカラムと方向を指定。複数指定はカンマ区切り。
  - `select`: 返却フィールドを制御し、不要な列の送信を避ける。

### 1.3 Edge Functions（予定）
- `sync-instagram`: Instagram 投稿リンクをバリデーションし、最新画像 URL を抽出。
- `update-favorites`: 認証済ユーザーの並び替えをバッチで保存。

### 1.4 スキーマ定義
- 詳細は `docs/02-design.md` のデータベース設計を参照。
- JSON Schema / Zod スキーマは `packages/shared` に配置予定。

### 1.5 エラーハンドリング
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

- Supabase REST でエラーが発生した場合は `supabase-js` のエラーオブジェクトをラップし、上記フォーマットに変換する。
- Edge Function では例外をキャッチし、`status` を明示的に設定してレスポンスを返す。

### 1.6 バージョニングとレート制限
- Supabase REST は `/rest/v1` を基本とし、非互換な変更が必要な場合は `/rest/v2` のように新バージョンを追加する。
- パブリックエンドポイントへのアクセスは IP 単位でレート制限（例: 100 req/10min）を設け、429 発生時には `Retry-After` を返す。

## 2. Instagram Embed API
### 2.1 埋め込み方式
- 公式の oEmbed エンドポイントを使用: `https://graph.facebook.com/v17.0/instagram_oembed?url={POST_URL}` [[1]](#ref1)
- oEmbed レスポンスから得られた HTML をサーバー側（Supabase Edge Function もしくは Next.js Route Handler）で DOMPurify などを用いてサニタイズし、`iframe` 要素と `script` の読み込み情報を分離して保存する。
- クライアント側では `sandbox="allow-scripts allow-same-origin"` を付与した `iframe` を描画し、`next/script` で Instagram SDK (`https://www.instagram.com/embed.js`) の読み込みのみを行う。

### 2.2 表示手順
1. Supabase の `schedules` テーブルから `post_url`・`embed_html`（サニタイズ済み）・フォールバック画像 URL を取得。
2. サーバーコンポーネント（例: `app/page.tsx`）で `embed_html` を `InstagramEmbed` コンポーネントへ渡す。
3. `InstagramEmbed` コンポーネントでは以下を実施する。
   - `iframe` を JSX として再構築し、`title`・`aria-label`・`loading="lazy"`・`referrerPolicy="no-referrer"` を付与。
   - `sandbox` 属性を付与し、`allowfullscreen`・`allowtransparency` は許可しない。
   - `next/script` で Instagram SDK を読み込み、`window.instgrm?.Embeds.process()` を呼び出す。
4. 定期バッチまたは手動更新時には Edge Function で oEmbed を再取得し、HTML をサニタイズして `embed_html` を更新する。

### 2.3 フォールバック
- 埋め込み取得に失敗した場合は、スケジュール画像 URL を `<img>` 要素で表示し、`alt` テキストに拠点名と対象月を含める。
- フォールバックが発生した際は Supabase のログテーブルに保存し、手動で確認できるようにする。

## 3. クッキー仕様
### 3.1 名称と属性
- 名前: `csh_favorites`
- 値: JSON 文字列。例: `[{"facilityId":"<uuid>","sortOrder":1}]`
- 期限: 180 日（`Max-Age=15552000`）
- 属性: `SameSite=Lax; Secure; Path=/`（本番）、開発環境では `Secure` を無効化
- PII やユーザー識別情報は保持しない。

### 3.2 読み書きフロー
1. 初回アクセス時にクッキーがなければ生成。
2. お気に入り登録時に JSON 配列へ `facilityId` を追加し、`sortOrder` を更新。
3. 並び替え操作時に順序を更新し、クッキーを再保存。配列は最大 30 件までとする。
4. クッキーはサーバーコンポーネントで読み込み、初期状態に反映。

## 4. 将来の API 拡張
- 認証統合後は GraphQL または RPC 関数でバッチ更新を実装。
- Instagram 自動巡回用に定期実行ワーカー（Supabase Scheduled Functions）を追加。
- CSV ダウンロード用に `/api/export` を実装し、最新データを生成。

## 5. 参考文献
- <a id="ref1"></a>[1] Instagram Embed API ドキュメント, https://developers.facebook.com/docs/instagram/oembed
- <a id="ref2"></a>[2] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref3"></a>[3] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
