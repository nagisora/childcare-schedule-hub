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
   - `apps/web/env.local.example` を `apps/web/.env.local` にコピーし、Supabase プロジェクトの実際の値を設定する。
   - この `.env.local` ファイルは Git にコミットされない（`.gitignore` で除外されている）。

### 2.3 ローカル開発サーバー
```bash
mise exec -- pnpm --filter web dev
```
- ブラウザで `http://localhost:3000` を開く。
- Supabase ローカルを利用する場合は `supabase start` 後に `.env.local` を更新する。
- 注: `apps/web/package.json` の name が `web` のため、`--filter web` でフィルタする。mise を使わない場合は `cd apps/web && pnpm dev` でも可。

### 2.4 Supabase プロジェクト設定

1. Supabase プロジェクトの作成・環境変数設定・テーブル作成は、**原則として Cursor + Supabase MCP を用いて AI に実行させることを推奨**します。詳細な手順は [06 DB セットアップ & 手動オペレーション](./06-db-operations.md) を参照してください:
   - Supabase MCP の導入手順: [06 節 2](./06-db-operations.md#2-supabase-mcpcursor-連携)
   - AI への依頼パターン: [06 節 3.1](./06-db-operations.md#31-aiへの依頼パターン)
   - 環境変数設定手順: [06 節 4.2](./06-db-operations.md#42-環境変数の取得と設定)
   - テーブル作成手順: [06 節 4.3](./06-db-operations.md#43-テーブル作成)
2. RLS ポリシーは「公開読み取り / 管理者書き込み」を原則とし、`favorites` はポストMVPで有効化（[02 設計資料](./02-design.md) 3.4 節を参照）
3. Vercel 環境変数に Supabase URL / キーを登録する（[3.4 環境別運用](#34-環境別運用) を参照）

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

このプロジェクトでは、`apps/web/env.local.example` をテンプレートとして提供しています。

**セットアップ手順:**
1. `apps/web/env.local.example` を `apps/web/.env.local` にコピーする。
2. Supabase プロジェクトのダッシュボード（https://app.supabase.com）にアクセスする。
3. Settings > API から以下を取得し、`.env.local` に設定する:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. `.env.local` は Git にコミットされない（`.gitignore` で除外されている）。

**テンプレート例 (`apps/web/env.local.example`):**
```ini
# クライアントから参照可能（NEXT_PUBLIC_ プレフィックスを付与）
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# サーバー専用（クライアントに公開しない）
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJI..."
INSTAGRAM_OEMBED_TOKEN=""
SUPABASE_DB_PASSWORD=""        # Supabase CLI を使う場合
```

**注意事項:**
- `apps/web/.env.local` は Next.js のビルド時・実行時に自動的に読み込まれる。
- 環境変数が未設定の場合、`apps/web/lib/supabase.ts` で初期化時にエラーが発生し、ビルド・実行が失敗する。

### 3.3 管理方針
- `NEXT_PUBLIC_*` 以外の値はクライアントバンドルへ含めない。
- Service Role Key を扱う処理では `process.env` を直接参照し、クライアントで評価されないよう条件分岐を実装する。
- 共有が必要な値は `.env.example` にダミー値を追加し、PR で変更点を共有する。

### 3.4 環境別運用
- Vercel の `Production` / `Preview` / `Development` に同一キーを登録し、Service Role Key は `Encrypted` として保存する。
- Preview デプロイで動作検証する際は、必要な環境変数が設定されているか `vercel env pull` で確認する。

## 4. データベースと Supabase CLI

### 4.1 初回セットアップ（フェーズ3）

フェーズ3の代表フロー「拠点一覧 → スケジュール表示 → お気に入り」を動作させるための DB セットアップは、**基本的に Cursor + Supabase MCP を用いて AI が実行し、人間は確認を行う**ことを推奨します。MCP を利用できない場合のみ、[06 DB セットアップ & 手動オペレーション](./06-db-operations.md) に従って手動実行してください。

詳細な手順は [06 DB セットアップ & 手動オペレーション](./06-db-operations.md) を参照してください:

- **Supabase MCP のセットアップ**（初回のみ、[06 節 2](./06-db-operations.md#2-supabase-mcpcursor-連携)）
- **Supabase プロジェクトの作成・設定**（推奨: AI に依頼、[06 節 4.1](./06-db-operations.md#41-supabase-プロジェクトの作成設定)）
- **環境変数の取得と設定**（推奨: AI に依頼、[06 節 4.2](./06-db-operations.md#42-環境変数の取得と設定)）
- **テーブル作成**（推奨: Supabase MCP で AI に実行させる、[06 節 4.3](./06-db-operations.md#43-テーブル作成)）
  - `facilities` テーブル（MVP 必須）
  - `schedules` テーブル（MVP 必須、データは任意）
- **サンプルデータの投入**（推奨: Supabase MCP で AI に実行させる、[06 節 4.4](./06-db-operations.md#44-サンプルデータの投入)）
  - `facilities` テーブルに最低 3 件のデータ（必須）
  - `schedules` テーブルのサンプルデータ（任意）
- **動作確認**（[06 節 4.5](./06-db-operations.md#45-動作確認)）

**注意**: MCP 利用がデフォルト、手動実行はフォールバックです。AI への依頼パターンは [06 節 3.1](./06-db-operations.md#31-aiへの依頼パターン) を参照してください。

### 4.2 マイグレーションフロー（スキーマ変更時）

本番環境やチーム開発でスキーマ変更を行う場合は、Supabase CLI を活用したマイグレーション管理を行います。**開発環境でのスキーマ変更は Supabase MCP を利用して AI に実行させることも可能ですが、本番への反映は CLI によるマイグレーション管理を推奨**します。

詳細なコマンドは [06 DB セットアップ & 手動オペレーション](./06-db-operations.md) 5.2 節を参照してください:

1. スキーマ変更 → `supabase db diff --schema public > supabase/migrations/<timestamp>_<name>.sql`
2. 生成物を確認し、不要な DDL がないかレビュー
3. `supabase db push` でローカル DB に適用
4. Git に `supabase/migrations` を追加し、PR でレビューを受ける

### 4.3 Supabase CLI の基本操作

Supabase CLI を使ったローカル開発環境やマイグレーション管理のコマンドは、[06 DB セットアップ & 手動オペレーション](./06-db-operations.md) 5 節を参照してください。

**注意**: 日常の DB 操作（テーブル作成・データ投入など）は Supabase MCP を優先してください。Supabase CLI は、スキーマ差分管理や CI でのマイグレーション整合性チェックなどに使用します。

主要コマンド:
- ローカル起動/停止: `supabase start` / `supabase stop`
- マイグレーション管理: `supabase db diff`, `supabase db push`, `supabase migration repair`
- リモート連携: `supabase link`, `supabase db reset --linked`
- CI チェック: `supabase db lint`

詳細: [06 DB セットアップ & 手動オペレーション](./06-db-operations.md) 5 節

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
- **テスト観点表**: 代表フロー（拠点一覧 → スケジュール表示 → お気に入り）のテスト観点表（等価分割・境界値）は [`docs/tests/representative-flow.md`](./tests/representative-flow.md) を参照。各テストケースは観点表の Case ID と対応づけられている。

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
    - 代表的なクエリ: `select id,name,ward_name,address_full_raw,phone,instagram_url,website_url,facility_type,detail_page_url order by ward_name,name`
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

## 9.5 施設情報データ取得・投入フロー（フェーズ5）

### 9.5.1 スクレイピングガイドライン

**対象サイト**:
- 名古屋市子育て応援拠点一覧: `https://www.kosodate.city.nagoya.jp/play/ouenkyoten.html`
- 名古屋市地域子育て支援拠点一覧: `https://www.kosodate.city.nagoya.jp/play/supportbases.html`

**アクセスマナー**:
- **実行頻度**: 手動実行のみ（自動スケジュール実行は行わない）。名古屋市のデータ更新タイミングに合わせて月1回程度を目安とする。
- **User-Agent**: サービス名を含む識別可能な文字列を設定（例: `ChildcareScheduleHub/1.0 (+https://childcare-schedule-hub.example.com)`）。
- **アクセス間隔**: リクエスト間に最低1秒以上の間隔を設ける（サーバー負荷軽減のため）。
- **取得範囲**: 上記2ページのHTMLテーブル行のみを対象とし、他のページへの自動アクセスは行わない。
- **robots.txt**: 名古屋市サイトには `robots.txt` が公開されていないが、上記のマナーを遵守する。

**データ取得項目**:
- 拠点名（`<a>` タグのテキストと `href` 属性）
- エリア（区名）
- 住所（郵便番号含む）
- 電話番号
- その他、テーブルに含まれる補足情報（あれば）

**エラーハンドリング**:
- ネットワークエラー時は再試行（最大3回、指数バックオフ）。
- HTML構造変更時は警告ログを出力し、取得できたデータのみを処理する。
- データ欠損（電話番号なし等）は NULL として扱い、エラーとはしない。

### 9.5.2 手動入力フロー（CSVインポート）

**前提条件**:
- Supabase プロジェクトが作成済みで、`facilities` テーブルが全国対応スキーマに更新されていること（[02 設計資料](./02-design.md) 3.3 節参照）。

**手順**:
1. 名古屋市の2ページ（応援拠点・支援拠点）をブラウザで開き、テーブル内容を目視確認する。
2. GoogleスプレッドシートまたはローカルのCSVファイルに、以下の列を含むテンプレートを作成する（[CSVテンプレート](#955-csvテンプレート) 参照）。
3. テーブル行を1件ずつ転記し、必須項目（`name`, `facility_type`, `prefecture_name`, `city_name` 等）を埋める。
4. CSVファイルを保存し、Supabase Studio の Table Editor からインポートするか、SQLで `COPY` コマンドを実行する。

**CSVインポート手順（Supabase Studio）**:
1. Supabase プロジェクトのダッシュボードにアクセス（https://app.supabase.com）
2. Table Editor > `facilities` テーブルを開く
3. **Insert** > **Import data via CSV** をクリック
4. CSVファイルをアップロードし、列マッピングを確認
5. インポート実行後、データ件数とエラー有無を確認

**重複キー・上書きルール**:
- `facilities` テーブルには一意制約がないため、重複データが投入される可能性がある。
- 手動インポート時は、事前に `name` + `facility_type` + `address_full_raw` の組み合わせで重複チェックを行うことを推奨。
- 将来的には、`name` + `facility_type` + `municipality_code` の組み合わせで一意制約を追加することを検討（ポストMVP）。

### 9.5.3 スクレイピングスクリプト実行フロー

**前提条件**:
- Node.js 20.x 以上がインストールされていること
- `apps/scripts` ディレクトリにスクレイピングスクリプトが配置されていること
- Supabase 環境変数（`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`）が設定されていること

**通常モード（Supabase に直接書き込み）**:
```bash
cd apps/scripts
pnpm tsx fetch-nagoya-childcare-bases.ts
```

**dry-run モード（JSON出力のみ）**:
```bash
cd apps/scripts
pnpm tsx fetch-nagoya-childcare-bases.ts --dry-run > output.json
```

**実行後の確認**:
- Supabase Studio の Table Editor で `facilities` テーブルを確認し、投入件数が期待値と一致するか確認する。
- `facility_type` が正しく設定されているか（`childcare_ouen_base` / `childcare_support_base`）確認する。
- `detail_page_url` が正しく設定されているか確認する。

### 9.5.4 自動取得 vs 手動入力の運用ルール

**データ衝突時の優先順位**:
- 手動更新 > 自動取得（スクレイピング）
- 手動で更新したレコードは、次回のスクレイピング実行時に上書きされないよう、`source_type` カラム（将来追加予定）で識別する。

**自動取得の更新頻度**:
- 名古屋市のデータ更新タイミングに合わせて、手動でスクレイピングスクリプトを実行する（月1回程度を目安）。
- 自動スケジュール実行は行わない（サーバー負荷・利用規約遵守のため）。

**ログ保存方針**:
- スクレイピング実行時は、以下の情報をログに記録する:
  - 実行日時
  - 対象URL（応援拠点 / 支援拠点）
  - 取得件数
  - エラー件数（あれば）
- ログは `apps/scripts/logs/` ディレクトリに保存するか、Supabase の `facilities` テーブルに `last_fetched_at` カラム（将来追加予定）を記録する。

### 9.5.5 CSVテンプレート

`facilities` テーブルへの手動インポート用CSVテンプレート（必須項目は `*` で明示）:

| カラム名 | 必須 | 説明 | 例 |
| --- | --- | --- | --- |
| name* | 必須 | 拠点名 | `中区子育て支援センター` |
| facility_type* | 必須 | 施設種別 | `childcare_ouen_base` または `childcare_support_base` |
| prefecture_code | 任意 | 都道府県コード | `23`（愛知県） |
| municipality_code | 任意 | 市区町村コード | `23100`（名古屋市） |
| ward_code | 任意 | 区コード | `23101`（中区） |
| postal_code | 任意 | 郵便番号 | `460-0001` |
| prefecture_name* | 必須 | 都道府県名 | `愛知県` |
| city_name* | 必須 | 市区町村名 | `名古屋市` |
| ward_name | 任意 | 区名 | `中区` |
| address_rest | 任意 | 丁目以降 | `三の丸1-1-1` |
| address_full_raw | 任意 | 住所の生文字列 | `〒460-0001 名古屋市中区三の丸1-1-1` |
| area | 任意 | エリア（後方互換用） | `中区` |
| address | 任意 | 住所（後方互換用） | `〒460-0001 名古屋市中区三の丸1-1-1` |
| phone | 任意 | 電話番号 | `052-123-4567` |
| instagram_url | 任意 | Instagram URL | `https://www.instagram.com/...` |
| website_url | 任意 | 公式サイトURL | `https://example.com` |
| detail_page_url | 任意 | 詳細ページURL | `https://www.kosodate.city.nagoya.jp/play/...` |

**サンプル行（CSV形式）**:
```csv
name,facility_type,prefecture_code,municipality_code,ward_code,postal_code,prefecture_name,city_name,ward_name,address_rest,address_full_raw,area,address,phone,instagram_url,website_url,detail_page_url
中区子育て支援センター,childcare_ouen_base,23,23100,23101,460-0001,愛知県,名古屋市,中区,三の丸1-1-1,〒460-0001 名古屋市中区三の丸1-1-1,中区,〒460-0001 名古屋市中区三の丸1-1-1,052-123-4567,,,https://www.kosodate.city.nagoya.jp/play/...
```

## 10. 参考文献
- <a id="ref3"></a>[3] Jun Ito, 『みらい まる見え政治資金』を支える技術, https://note.com/jujunjun110/n/nee305ca004ac
- <a id="ref4"></a>[4] Jun Ito, どのようにして95%以上のコードをLLMに書かせることができたのか, https://note.com/jujunjun110/n/na653d4120d7e
