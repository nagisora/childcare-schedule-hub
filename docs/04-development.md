# 04 開発メモ

## 1. 開発環境セットアップ
1. Node.js 20.x、pnpm 8.x をインストール
2. リポジトリをクローン
   ```bash
   pnpm install
   ```
3. Supabase プロジェクトを作成し、`.env.local` に接続情報を設定
   ```ini
   NEXT_PUBLIC_SUPABASE_URL="https://..."
   NEXT_PUBLIC_SUPABASE_ANON_KEY="..." # ブラウザ公開鍵
   SUPABASE_SERVICE_ROLE_KEY="..." # サーバー専用
   ```
4. Tailwind CSS と ESLint 設定を適用（`pnpm dlx @next/codemod` を活用）
5. `pnpm dev --filter web` でローカル開発サーバー起動

### 環境変数一覧

| 変数名 | 必須 | スコープ | デフォルト | 用途 / 注意事項 |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | クライアント / サーバー | なし | Supabase プロジェクト URL。`NEXT_PUBLIC_` 接頭辞によりクライアントへ配信される。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | クライアント / サーバー | なし | Supabase Anon キー。公開可能なキーだが、無料枠保護のためローテーションポリシーを準備する。 |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 | サーバーのみ | なし | Edge Function や ISR 再生成で使用。クライアントに送信禁止。Vercel では Server-side Env にのみ設定。 |
| `INSTAGRAM_OEMBED_ACCESS_TOKEN` | 任意 | サーバーのみ | なし | Instagram oEmbed を高頻度で呼ぶ場合に必須。開発環境では未設定時にレート制限へ注意。 |
| `CSH_COOKIE_SIGNING_SECRET` | 任意 | サーバーのみ | ランダム文字列 | お気に入りクッキーに署名を付与する場合に利用。導入時は 32 文字以上のランダム値を使用する。 |

- クライアント側に配信される環境変数は `NEXT_PUBLIC_` を接頭辞として定義する。それ以外の値はサーバー実行環境（`process.env`）でのみ参照可能とし、ブラウザへバンドルしない。
- `.env.local` はローカル専用であり、リポジトリへコミットしない。共有が必要な場合は `.env.example` を用意する。
- Vercel では `Production` / `Preview` / `Development` 各環境の Environment Variables に同一キーを設定し、Service Role Key は `Encrypted` として保存する。

## 2. 作業フロー
1. `docs/` 内の資料を更新し、タスクを明確化
2. LLM（Cursor）にコンポーネント単位の実装を依頼、レビューを行う [[4]](#ref4)
3. Pull Request を作成し、GitHub 上でレビュー
4. main ブランチにマージ後、Vercel が自動デプロイ

## 3. データ投入手順
- Supabase SQL Editor で `facilities` / `schedules` の初期データを投入
- Instagram URL と埋め込み HTML を登録（Embed 取得ツールを別途用意）
- テストデータ例は `seed/initial_data.sql`（将来作成）にまとめる

## 4. パフォーマンス・キャッシュ
- Next.js ISR を 60 分に設定し、キャッシュ安定性を確保 [[3]](#ref3)
- Supabase Edge Functions でレスポンスをキャッシュし、高負荷時の安定性を向上
- Vercel Speed Insights を定期確認し、LCP < 2.5s を維持

## 5. アクセシビリティ・品質
- Storybook で UI コンポーネントのアクセシビリティ検証を実施
- Axe DevTools / Lighthouse で自動テスト
- キーボード操作、スクリーンリーダー対応を定期チェック [[3]](#ref3)

## 6. テスト戦略
- **単体テスト (Vitest)**: UI コンポーネントとユーティリティを対象に `pnpm test --filter web` を実行。`apps/web` 配下の `__tests__` ディレクトリに配置し、スナップショットは極力避ける。
- **型チェック (TypeScript)**: `pnpm typecheck --filter web` を CI で実行し、`tsconfig.build.json` を参照。型エラーをゼロに保つ。
- **統合テスト (Playwright)**: ユーザーフロー（拠点一覧表示、お気に入り操作など）を `apps/web/tests/e2e` に実装。`pnpm e2e --filter web` で実行し、CI ではヘッドレスモードを使用。
- **アクセシビリティ検証 (axe / Lighthouse)**: Storybook 上で `@axe-core/react` を用いた自動検証を行い、週次で Lighthouse CI を実行。重大な指摘は issue 化し 2 スプリント以内に解消。
- **カバレッジ目標**: 単体テスト 70% / 重要なユースケース 100% を目標に CI で `pnpm test --filter web --coverage` を実行し、閾値を下回った場合はビルドを失敗させる。
- **CI 実行順序**: `lint` → `typecheck` → `test` → `e2e` の順で GitHub Actions を設定し、Playwright の結果はアーティファクトとして保存する。

## 7. デプロイ
1. GitHub リポジトリと Vercel を連携
2. 環境変数を Vercel のプロジェクト設定に反映
3. プレビュー URL で動作確認後、本番にデプロイ

## 8. トラブルシューティング
| 問題 | 対処 |
| --- | --- |
| Instagram 埋め込みが読み込めない | 投稿 URL の有効性を確認し、oEmbed レスポンスとサニタイズ前後の HTML を Supabase ログに保存。必要に応じてフォールバック画像で代替。 |
| Supabase REST が 401 を返す | `apikey` ヘッダーに `NEXT_PUBLIC_SUPABASE_ANON_KEY` が設定されているか確認。RLS ポリシーが正しく適用されているか `auth.uid()` をログ出力して検証。 |
| Edge Function が 403 を返す | Service Role キーがヘッダーに含まれているか、Edge Function 側で `verifyJWT` を通過しているか確認。環境変数の値を再設定する。 |
| Supabase Migration が失敗する | `supabase db reset` を実行しローカル DB を再生成。競合がある場合は `supabase migration repair` で状態を調整し、Git に `<timestamp>_rollback.sql` を追加。 |
| Playwright テストが失敗する | `pnpm e2e --filter web --headed --debug` でデバッグし、テスト対象ページのロード待ちを `page.waitForLoadState('networkidle')` で保証。CI では `TRACE_ON_RETRY=1` を設定し、トレースを確認。 |
| お気に入りが保存されない | クッキー属性（Secure, SameSite）とドメイン設定を確認。ローカル開発では `Secure` を無効化し、`http://localhost` で動作するか確認。 |
| ISR が更新されない | `revalidateTag('facilities')` / `revalidateTag('schedules')` を手動で呼び出す API を実行。Vercel のビルドログで ISR エラーが出ていないか確認。 |
| Vercel デプロイが環境変数不足で失敗する | Vercel Dashboard の Environment Variables を確認し、Production/Preview/Development のそれぞれに値が入っているかチェック。再デプロイをトリガーする。 |

## 9. 参考文献
- <a id="ref3"></a>[3] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref4"></a>[4] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
