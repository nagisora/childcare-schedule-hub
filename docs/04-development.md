# 04 開発ガイド

## 1. ドキュメント情報
| 項目 | 内容 |
| --- | --- |
| バージョン | 0.2.0 |
| 最終更新日 | 2025-11-14 |
| 作成責任者 | Childcare Schedule Hub 開発チーム |
| 対象読者 | 開発者、レビュアー、運用担当 |
| 参照元 | [01 要件定義](./01-requirements.md)、[02 設計資料](./02-design.md)、[03 API 仕様](./03-api.md) |

本書は恒常的な開発業務のガイドラインをまとめる。臨時メモは issue / PR のコメントに記録し、確定事項のみ本書へ反映する。

補足: 高レベルの進め方（開発フェーズ）は [05 開発フェーズ](./05-development-phases.md) を参照。短時間作業の計画・記録には `docs/dev-sessions/template-session.md` をコピーして利用する。

## 2. 開発環境セットアップ

### 2.1 前提ソフトウェア
- Node.js 20.x（LTS）
- pnpm 8.x 以上
- Git、Vercel CLI（プレビュー確認用）
- Supabase CLI 1.150.x 以上（ローカル DB・マイグレーション管理）

### 2.2 初期準備（mise を利用）
このプロジェクトでは Node.js / pnpm などのランタイムを **mise** で管理します。

1. リポジトリ取得（未取得の場合）
   ```bash
git clone <REPO_URL>
cd childcare-schedule-hub
```

2. mise の信頼設定とインストール
```bash
mise trust -y mise.toml
mise install
```

3. 依存パッケージのインストール（パッケージ構成が揃っている場合）
```bash
mise exec -- pnpm install
   ```
2. Tailwind / ESLint などの設定はリポジトリに同梱。アップデート時は `pnpm dlx @next/codemod` 等を活用。
3. Supabase プロジェクトを用意し、接続情報を `.env.local` に設定（詳細は [3. 環境変数管理](#3-環境変数管理)）。

### 2.3 ローカル開発サーバー
```bash
mise exec -- pnpm --filter web dev
```
- ブラウザで `http://localhost:3000` を開く。
- Supabase ローカルを利用する場合は `supabase start` 後に `.env.local` を更新する。
- 注: `apps/web/package.json` の name が `web` のため、`--filter web` でフィルタする。mise を使わない場合は `cd apps/web && pnpm dev` でも可。

### 2.4 Supabase プロジェクト設定
1. [02 設計資料](./02-design.md) の定義で `facilities` / `schedules` テーブルを作成。
2. RLS ポリシーは「公開読み取り / 管理者書き込み」を原則とし、`favorites` はポストMVPで有効化。
3. `.env.local` および Vercel 環境変数に Supabase URL / キーを登録する。

### 2.5 Supabase CLI の基本操作
- プロジェクト初期化: `supabase init`
- ローカル起動: `supabase start`
- スキーマ適用: `supabase db push`
- マイグレーション作成: `supabase migration new <name>` → `supabase db push`
- データリセット/シード: `supabase db reset --linked`、`supabase db seed --file seed/initial_data.sql`
- リモート連携: `supabase link --project-ref <id>` / CI では `supabase db lint`

## 3. 環境変数管理

### 3.1 主要変数一覧
| 変数名 | 必須 | スコープ | デフォルト | 用途 / 注意事項 |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | クライアント / サーバー | なし | Supabase プロジェクト URL。`NEXT_PUBLIC_` 接頭辞によりクライアントへ配信。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | クライアント / サーバー | なし | Supabase Anon キー。公開可能だが、無料枠保護のためローテーションポリシーを準備。 |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 | サーバーのみ | なし | Edge Function や ISR 再生成で使用。クライアントへ送信禁止。 |
| `INSTAGRAM_OEMBED_TOKEN` | 任意 | サーバーのみ | なし | Instagram oEmbed を高頻度で呼ぶ場合に必須。未設定時はレート制限に注意。 |
| `CSH_COOKIE_SIGNING_SECRET` | 任意 | サーバーのみ | ランダム文字列 | お気に入りクッキーへ署名を付与する場合に利用。32 文字以上を推奨。 |

### 3.2 `.env.local` テンプレート（ローカル用）
```ini
# クライアントから参照可能（NEXT_PUBLIC_ プレフィックスを付与）
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# サーバー専用（クライアントに公開しない）
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI..."
INSTAGRAM_OEMBED_TOKEN=""
SUPABASE_DB_PASSWORD=""        # Supabase CLI を使う場合
```

### 3.3 管理方針
- `NEXT_PUBLIC_*` 以外の値はクライアントバンドルへ含めない。
- Service Role Key を扱う処理では `process.env` を直接参照し、クライアントで評価されないよう条件分岐を実装する。
- 共有が必要な値は `.env.example` にダミー値を追加し、PR で変更点を共有する。

### 3.4 環境別運用
- Vercel の `Production` / `Preview` / `Development` に同一キーを登録し、Service Role Key は `Encrypted` として保存する。
- Preview デプロイで動作検証する際は、必要な環境変数が設定されているか `vercel env pull` で確認する。

## 4. データベースと Supabase CLI

### 4.1 マイグレーションフロー
1. スキーマ変更 → `supabase db diff --schema public > supabase/migrations/<timestamp>_<name>.sql`
2. 生成物を確認し、不要な DDL がないかレビュー。
3. `supabase db push` でローカル DB に適用。
4. Git に `supabase/migrations` を追加し、PR でレビューを受ける。

### 4.2 シードデータ
- `seed/initial_data.sql` に最低限のテストデータを定義。
  - `facilities`: 名称/エリア/住所/Instagram URL を揃えた 3 件。
  - `schedules`: 各拠点に最新月の画像 URL を 1 件。
  - ポストMVP: `favorites` のダミーデータ。
- 実行例: `supabase db reset --seed seed/initial_data.sql`

### 4.3 CLI コマンドリファレンス
- ローカル起動/停止: `supabase start` / `supabase stop`
- マイグレーション修復: `supabase migration repair`
- リンク済みプロジェクトでのリセット: `supabase db reset --linked`
- CI チェック: `supabase db lint` でマイグレーション整合性を検証

### 4.4 リモート連携メモ
- `supabase link --project-ref <id>` でリモート DB と接続し、Service Role Key を設定。
- 本番 DB へ適用する場合は GitHub Actions もしくは手動 `supabase db push` を使用し、Apply 後にログを確認する。

## 5. 作業フローと品質管理

### 5.1 日常フロー
1. `docs/` の要件・設計・API を確認し、タスクを issue に整理。
2. ブランチ命名は `feature/<topic>`・`chore/<topic>`・`fix/<topic>` を使用。
3. LLM（Cursor 等）を活用する場合も、仕様根拠をコメントに残す。
4. PR 作成時はテンプレートに沿って検証結果（Lint/テスト）を記録し、レビューを依頼する。

### 5.2 pnpm スクリプト
| コマンド | 説明 |
| --- | --- |
| `mise exec -- pnpm --filter web lint` | ESLint チェック |
| `mise exec -- pnpm --filter web typecheck` | TypeScript 型チェック |
| `mise exec -- pnpm --filter web test` | ユニットテスト |
| `mise exec -- pnpm --filter web test:coverage` | カバレッジ取得 |
| `mise exec -- pnpm --filter web e2e` | E2E テスト（Playwright） |
| `mise exec -- pnpm --filter web dev` | フロントエンドの開発サーバー |
| `mise exec -- pnpm --filter web build` | プロダクションビルド |

注: mise を使わない場合は `cd apps/web && pnpm <command>` でも実行可能。

### 5.3 パフォーマンス・キャッシュ
- ISR を 60 分に設定し、初回表示 3 秒以内を維持（[01 要件定義](./01-requirements.md)）。
- `revalidateTag` などの再生成フローを API 実装時に忘れずに追加し、Vercel Speed Insights / Lighthouse CI を週次で記録する。

### 5.4 アクセシビリティ・品質
- Storybook + Axe による自動検証を PR 前に実行。
- 手動チェック: キーボード操作、フォーカスインジケータ、スクリーンリーダー読み上げ。
- Lighthouse / axe-core のレポートを PR に添付し、基準値を満たさない場合は改善する。

### 5.5 コーディング規約
- React コンポーネントは PascalCase、hooks は `use` 接頭辞。
- 共有 UI は `apps/web/components`、ビジネスロジックは `apps/web/lib` に配置し、共通化対象が 3 ファイル以上の場合は専用ディレクトリを新設。
- Tailwind CSS を基本とし、任意スタイルは `apps/web/app/globals.css` に限定。
- `any` / 安易な `as` の使用は避け、必要に応じて Zod スキーマで型を生成する。
- LLM 生成コードは eslint/prettier を通し、根拠（参照仕様）をコメントとして残す。

### 5.6 テスト戦略
- **単体テスト (Vitest)**: UI コンポーネントとユーティリティを対象に `pnpm test --filter web` を実行し、`__tests__` ディレクトリへ配置。
- **型チェック (TypeScript)**: `pnpm typecheck --filter web` を CI で実行し、ゼロエラーを維持。
- **統合テスト (Playwright)**: 拠点一覧表示・お気に入り操作など主要フローを `apps/web/tests/e2e` に実装。`pnpm e2e --filter web` で実行し、CI ではヘッドレスモードとトレース保存を有効化。
- **アクセシビリティ検証**: Storybook 上で `@axe-core/react` を利用し、週次で Lighthouse CI を実行。
- **カバレッジ目標**: 単体 70% / 重要ユースケース 100% を目標に `pnpm test --filter web --coverage` を実行。閾値を下回った場合はビルドを失敗させる。
- **CI 実行順序**: `lint` → `typecheck` → `test` → `e2e` の順で GitHub Actions を設定し、Playwright の結果はアーティファクトとして保存する。

### 5.7 MVP 代表フロー実装方針（apps/web）

代表フロー「拠点一覧 → スケジュール表示 → お気に入り」は、`apps/web` のルーティング・状態管理・API 利用を一貫した形で実装する。

- ルーティングとページ構成
  - トップページ: `apps/web/app/page.tsx`
    - サーバーコンポーネントとして実装し、Supabase から拠点一覧を取得する。
    - 「よく使う拠点」セクションと「拠点一覧」テーブルを 1 ページ内に配置する。
  - 拠点詳細ページ（ポストMVP）: `apps/web/app/facilities/[id]/page.tsx`
    - 指定拠点の基本情報と最新スケジュールを表示し、代表フロー上の「スケジュール表示」を担う。
- データ取得とキャッシュ
  - トップページでは Supabase REST（もしくは `@supabase/supabase-js`）を用いて `facilities` テーブルを取得する。
    - 代表的なクエリ: `select id,name,area,address,phone,instagram_url,website_url order by area,name`
    - ISR / `revalidateTag('facilities')` の設定は [02 設計資料](./02-design.md) 3.3 節と整合させる。
  - （ポストMVP）拠点詳細ページでは `schedules` テーブルから対象拠点の最新スケジュールを取得する。
- お気に入り状態管理
  - サーバー側: `cookies()` API から `csh_favorites` を読み取り、初期状態をサーバーコンポーネントで組み立てる。
  - クライアント側:
    - 「よく使う拠点」セクションをクライアントコンポーネントとして分離し、`useOptimistic` などで並び替え操作を即時に反映する。
    - お気に入り追加/削除・並び替えのたびにクッキーを書き換えるヘルパー関数（例: `updateFavoritesCookie`）を `apps/web/lib/cookies.ts` に定義する。
  - 制約:
    - 最大 5 件までをお気に入りとして扱う（[01 要件定義](./01-requirements.md) の MVP 要件に準拠）。
    - MVP では DB への書き込みは行わず、ポストMVPで `favorites` テーブルと同期する。
- UI コンポーネント構成（例）
  - `FavoriteFacilitiesSection`: 「よく使う拠点」エリア。お気に入りカードの並び替え・削除を担当。
  - `FacilityTable`: 全拠点一覧を表形式で表示し、「+」ボタンでお気に入り追加を行う。
  - `SchedulePreview`（ポストMVP）: 拠点の最新スケジュール画像/埋め込みを表示するコンポーネント。
  - 共通レイアウトやカード UI は `packages/ui` に切り出すことを検討する。

これらの方針に従うことで、仕様変更時にも「代表フロー」を起点にコードベース全体の影響範囲を把握しやすくする。

## 6. Git フローとレビュー
- `main` ブランチは常にデプロイ可能な状態を維持。
- PR は `main`（または指定の release ブランチ）へのマージのみ許可し、レビューは最低 1 名必須。
- コミットメッセージは Conventional Commits (`feat:`, `fix:`, `docs:` 等) を推奨。
- 要件・設計・API に影響する変更は該当ドキュメントを同じ PR で更新し、レビュー指摘を減らす。

## 7. デプロイと運用
1. GitHub と Vercel を連携し、PR ごとにプレビュー環境を自動生成。
2. 本番デプロイ前にプレビュー URL で動作確認し、非機能要件を満たすかチェック。
3. 環境変数は Vercel の Environment（Preview / Production）に分けて登録する。
4. トラブル時は `supabase logs` や Vercel ログを確認し、影響度を即時に共有する。

## 8. トラブルシューティング
| 問題 | 対処 |
| --- | --- |
| Instagram 埋め込みが表示されない | 投稿 URL と oEmbed レスポンスを確認し、[03 API 仕様](./03-api.md) の手順通りに再取得。連続失敗は Edge Function の通知・`instagram_errors` ログを確認。 |
| Supabase REST が 401/403 を返す | RLS ポリシーと `apikey` ヘッダー、Service Role 利用箇所を確認。匿名アクセスが許可されているか `auth.uid()` をログ出力して検証。 |
| お気に入りが保存されない | クッキー属性（`SameSite`, `Secure`）とドメイン設定を確認。ローカルでは `Secure` を無効化して `http://localhost` で動作確認。 |
| Edge Function が 403 | Service Role キーがヘッダーに含まれているか、`verifyJWT` を通過しているか確認。環境変数を再設定する。 |
| Supabase Migration が失敗する | `supabase db reset` でローカル DB を再生成。競合がある場合は `supabase migration repair` を実行し、`<timestamp>_rollback.sql` を追加。 |
| Playwright テストが失敗する | `pnpm e2e --filter web --headed --debug` でデバッグし、`page.waitForLoadState('networkidle')` を活用。CI ではトレース保存を有効化。 |
| ISR が更新されない | `revalidateTag('facilities')` / `revalidateTag('schedules')` の呼び出しを確認し、必要に応じて `/api/revalidate` を手動実行。 |
| Supabase クォータ超過 | [01 要件定義](./01-requirements.md) のリスク対応に従い、プラン変更またはキャッシュ最適化を検討。 |

## 9. 運用 Runbook
- **ISR 再生成**: `/api/revalidate` に対象タグ (`facilities` / `schedules`) を付与して POST。成功レスポンスと Vercel ダッシュボードを確認。
- **ログ確認**: Supabase Studio の Logs タブでエラー/関数ログを確認し、Instagram 埋め込み失敗ログは 24 時間以内にレビュー。
- **ロールバック**: 重大障害時は Vercel の Deploy ログから直前成功ビルドにロールバックし、Supabase `supabase db restore` で最新バックアップを適用。
- **連絡体制**: 管理者メール `ops@childcare-hub.example` と Slack `#childcare-hub-ops` に通知。SLO 逸脱時は 30 分以内に一次報告。

## 10. 参考文献
- <a id="ref3"></a>[3] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref4"></a>[4] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
