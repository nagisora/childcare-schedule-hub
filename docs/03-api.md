# 03 API 仕様

## 1. Supabase API
Supabase は PostgreSQL をベースとした BaaS であり、自動生成される REST API と Edge Functions を利用する。

### 1.1 認証
- MVP では匿名公開読み取りを許可（RLS で制御）。
- 将来は JWT（Supabase Auth + NextAuth.js）による保護を追加。

### 1.2 エンドポイント
| リソース | メソッド | パス | 概要 |
| --- | --- | --- | --- |
| facilities | GET | `/rest/v1/facilities` | 拠点一覧取得（`select=name,area,address,phone,instagram_url,instagram_embed_code,website_url`） |
| facilities | POST | `/rest/v1/facilities` | 管理者による拠点登録（将来） |
| schedules | GET | `/rest/v1/schedules?facility_id=eq.{id}&order=created_at.desc&limit=1` | 最新スケジュール取得 |
| schedules | POST | `/rest/v1/schedules` | 管理者によるスケジュール登録（将来） |
| favorites | GET | `/rest/v1/favorites?cookie_id=eq.{cookie}` | お気に入り取得（MVP では未使用） |
| favorites | UPSERT | `/rest/v1/favorites` | お気に入り登録/並び順更新（将来） |

### 1.3 Edge Functions（予定）
- `sync-instagram`: Instagram 投稿リンクをバリデーションし、最新画像 URL を抽出。
- `update-favorites`: 認証済ユーザーの並び替えをバッチで保存。

### 1.4 スキーマ定義
- 詳細は `docs/02-design.md` のデータベース設計を参照。
- JSON Schema / Zod スキーマは `packages/shared` に配置予定。

## 2. Instagram Embed API
### 2.1 埋め込み方式
- 公式の oEmbed エンドポイントを使用: `https://graph.facebook.com/v17.0/instagram_oembed?url={POST_URL}`
- 取得した HTML を `dangerouslySetInnerHTML` ではなく、`next/script` を用いてサンドボックス化する。

### 2.2 表示手順
1. Supabase に保存した Instagram 投稿 URL をページロード時に取得。
2. サーバーコンポーネントで oEmbed を取得し、HTML とスクリプトを分離。
3. クライアントコンポーネントで Instagram の SDK をロードしてレンダリング。

### 2.3 フォールバック
- 埋め込み取得に失敗した場合は、スケジュール画像 URL を `<img>` 要素で表示。
- 失敗情報を Supabase のログテーブルに保存し、手動で確認できるようにする。

## 3. クッキー仕様
### 3.1 名称と属性
- 名前: `csh_favorites`
- 値: `"{facilityId}:{sortOrder}"` をカンマ区切りで複数保持
- 期限: 180 日
- 属性: `SameSite=Lax; Secure`（本番）、開発環境では Secure を無効化

### 3.2 読み書きフロー
1. 初回アクセス時にクッキーがなければ生成。
2. お気に入り登録時に `facilityId` を追加。
3. 並び替え操作時に順序を更新し、クッキーを再保存。
4. クッキーはサーバーコンポーネントで読み込み、初期状態に反映。

## 4. 将来の API 拡張
- 認証統合後は GraphQL または RPC 関数でバッチ更新を実装。
- Instagram 自動巡回用に定期実行ワーカー（Supabase Scheduled Functions）を追加。
- CSV ダウンロード用に `/api/export` を実装し、最新データを生成。

## 5. 参考文献
- [Instagram Embed API ドキュメント](https://developers.facebook.com/docs/instagram/oembed)
- Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
