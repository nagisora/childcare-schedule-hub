# 04 開発ガイド

## 1. ドキュメント情報
| 項目 | 内容 |
| --- | --- |
| バージョン | 0.2.0 |
| 最終更新日 | 2025-11-14 |
| 作成責任者 | Childcare Schedule Hub 開発チーム |
| 対象読者 | 開発者、レビュアー、運用担当 |
| 参照元 | [01 要件定義](./01-requirements.md)、[02 設計資料](./02-design.md)、[03 API 仕様](./03-api.md) |

本書は恒常的な開発業務のガイドラインをまとめる。臨時メモは別途 issue / PR ノートに記録し、本書には残さない。

## 2. 開発環境セットアップ

### 2.1 前提ソフトウェア
- Node.js 20.x（LTS）
- pnpm 8.x 以上
- Supabase CLI 1.150.x 以上（ローカル開発で利用可）
- Git、Vercel CLI（デプロイ検証用）

### 2.2 リポジトリ初期化
```bash
git clone <REPO_URL>
cd childcare-schedule-hub
pnpm install
```

### 2.3 ローカル開発サーバー
```bash
pnpm dev --filter apps/web
```
- ブラウザで `http://localhost:3000` を開く。
- Supabase ローカルを利用する場合は `supabase start` 後に `.env.local` を更新する。

### 2.4 Supabase プロジェクト設定
1. Supabase プロジェクトを作成し、`facilities` と `schedules` テーブルを [02 設計資料](./02-design.md) の定義で作成。
2. RLS ポリシーは公開読み取り・管理者書き込みに設定。
3. 必要な API キーを `.env.local`／Vercel プロジェクトに設定（次章参照）。

## 3. 環境変数管理

### 3.1 `.env.local` テンプレート（ローカル用）
```ini
# クライアントから参照可能（NEXT_PUBLIC_ プレフィックスを付与）
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# サーバー専用（クライアントに公開しない）
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI... (サーバーのみ)"
INSTAGRAM_OEMBED_TOKEN=""
SUPABASE_DB_PASSWORD=""        # Supabase CLI を使う場合
```

### 3.2 管理方針
- `NEXT_PUBLIC_*` 以外の値はクライアントバンドルへ含めない。
- `SUPABASE_SERVICE_ROLE_KEY` は Edge Function / サーバー処理専用。誤ってクライアントで読み込まないよう環境分岐を必ず実装する（[03 API 仕様](./03-api.md) 参照）。
- 環境変数の変更時は Vercel の環境設定も更新し、PR で共有する。

## 4. データベースとシード

### 4.1 マイグレーション
- Supabase CLI を用いて `supabase db diff` → `supabase db push` のフローでスキーマを同期。
- ER/テーブル設計は [02 設計資料](./02-design.md) を単一ソースとし、差分が出た場合は双方を更新する。

### 4.2 シードデータ
- 最低限のテストデータを `seed/initial_data.sql` にまとめる（※ファイル未作成のため TODO）。
- TODO: `seed/initial_data.sql` に以下のデータを追加する。
  - `facilities`: 名称/エリア/住所/Instagram URL が揃った 3 件のダミーデータ。
  - `schedules`: 各拠点につき最新月の画像 URL（プレースホルダー）を 1 件。
  - 将来: `favorites` のテストデータ（ポストMVP）。
- シード実行例（Supabase CLI）:
```bash
supabase db reset --seed seed/initial_data.sql
```

## 5. 作業フローと品質管理

### 5.1 日常フロー
1. `docs/` の要件・設計・API を確認し、タスクを issue に整理。
2. ブランチ命名 `feature/<topic>`・`chore/<topic>`・`fix/<topic>` を使用。
3. LLM（Cursor 等）でコード生成する場合も、レビュー基準を明確にしてコミット。
4. PR 作成時はテンプレートに沿って検証結果（Lint/テスト）を記録し、レビューを依頼する。

### 5.2 pnpm スクリプト
| コマンド | 説明 |
| --- | --- |
| `pnpm lint` | ESLint チェック |
| `pnpm typecheck` | TypeScript 型チェック |
| `pnpm test` | ユニットテスト（導入後） |
| `pnpm format` | Prettier フォーマット |
| `pnpm storybook` | Storybook 起動（導入後） |

### 5.3 パフォーマンス・キャッシュ
- ISR を 60 分に設定し、初回表示 3 秒以内を維持（[01 要件定義](./01-requirements.md)）。
- `revalidateTag` などの再生成フローを API 実装時に忘れずに追加。
- Vercel Speed Insights と Lighthouse CI を週次で記録し、LCP 2.5 秒以内を確認。

### 5.4 アクセシビリティ・品質
- Storybook + Axe によるアクセシビリティ自動検証を PR 前に実行。
- 手動チェック: キーボード操作、フォーカスインジケータ、スクリーンリーダー読み上げ。
- Lighthouse / axe-core による自動テスト結果を PR に添付し、基準値を満たさない場合は改善する。

## 6. Git フローとレビュー
- `main` ブランチは常にデプロイ可能な状態を維持。
- PR は `main`（または指定の release ブランチ）へのマージのみ許可。レビューは最低 1 名必須。
- コミットメッセージは Conventional Commits (`feat:`, `fix:`, `docs:` 等) を推奨。
- 変更が要件・設計・API に影響する場合は該当ドキュメントを同じ PR で更新し、レビュー指摘を減らす。

## 7. デプロイと運用
1. GitHub と Vercel を連携し、PR ごとにプレビュー環境を自動生成。
2. 本番デプロイ前にプレビュー URL で動作確認し、非機能要件を満たすかチェック。
3. 環境変数は Vercel の Environment（Preview / Production）に分けて登録する。
4. トラブル時は `supabase logs` や Vercel ログを確認し、影響度を報告する。

## 8. トラブルシューティング
| 問題 | 対処 |
| --- | --- |
| Instagram 埋め込みが表示されない | 投稿 URL と oEmbed レスポンスを確認し、[03 API 仕様](./03-api.md) の手順通りに再取得。連続失敗は Edge Function の通知を確認。 |
| Supabase REST が 401 を返す | RLS ポリシーと `apikey` ヘッダーを確認し、匿名アクセスが許可されているか検証。 |
| お気に入りが保存されない | クッキー属性（`SameSite`, `Secure`）とドメイン設定を確認。ポストMVP では DB 同期処理を併せて調査。 |
| ISR が更新されない | `revalidateTag` / `revalidatePath` の呼び出しを確認し、必要に応じて手動で再生成 API を叩く。 |
| Supabase クォータ超過 | [01 要件定義](./01-requirements.md) のリスク対応に従い、プラン変更またはキャッシュ最適化を検討。 |

## 9. 参考文献
- <a id="ref3"></a>[3] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref4"></a>[4] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
