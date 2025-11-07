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
   SUPABASE_SERVICE_ROLE_KEY="..." # サーバー専用
   ```
4. Tailwind CSS と ESLint 設定を適用（`pnpm dlx @next/codemod` を活用）
5. `pnpm dev --filter web` でローカル開発サーバー起動

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

## 6. デプロイ
1. GitHub リポジトリと Vercel を連携
2. 環境変数を Vercel のプロジェクト設定に反映
3. プレビュー URL で動作確認後、本番にデプロイ

## 7. トラブルシューティング
| 問題 | 対処 |
| --- | --- |
| Instagram 埋め込みが読み込めない | 投稿 URL の有効性を確認、oEmbed レスポンスを Supabase ログに保存 |
| Supabase REST が 401 を返す | RLS のポリシー、`apikey` ヘッダーを確認 |
| お気に入りが保存されない | クッキー属性（Secure, SameSite）とドメイン設定を確認 |
| ISR が更新されない | `revalidateTag` または API ルートで再生成をトリガー |

## 8. 参考文献
- <a id="ref3"></a>[3] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref4"></a>[4] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
