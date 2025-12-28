# チェックリスト式実装計画書: 2025-12-28

> **セッションとは**: このプロジェクトにおける「セッションの定義」は `docs/dev-sessions/session-definition.md` を参照。
>
> **重要（AI作業時）**: このセッションファイルは `date` コマンドで現在日付（`20251228`）を取得したうえで作成している。

## セッション概要とゴール

### 概要

- 一言サマリ: スマホから `schedules.instagram_post_url`（Instagram投稿URL）を手軽に登録できる「管理フォーム + サーバー側UPSERT（Basic認証）」を実装する
- 対応フェーズ: フェーズ10（スケジュールURLの全面カバー）※手動登録フローの“運用改善”として追加
- セッション種別: 実装（運用改善 / 管理UI）
- 実行方式: AI自律（ただし、認証情報の入力・本番/課金操作は人の明示確認を必須とする）
- 影響範囲: `apps/web`（管理画面/API/ミドルウェア） / `docs`（Runbook/環境変数）
- 日付: 2025-12-28
- 想定所要時間: 60〜180 分

### ゴール

> **チェックの付け方（完了条件）**:
> - 完了条件は **Markdownのチェックリスト**（`- [ ]`）で記述する（セッション開始時点では未チェック）
> - セッションの最後に、満たした完了条件を `- [x]` に更新する（ゴール達成のセルフチェック）
> - ✅（絵文字）のチェックは使わない（`- [ ]` / `- [x]` に統一）

- **ゴール**: スマホのブラウザだけで、対象施設×対象月の `instagram_post_url` をDBへ即反映で登録できる
  - 完了条件:
    - [x] `/admin/schedules/new` を開くと Basic 認証が要求され、認証後にフォームが表示される（middlewareで保護）
    - [x] フォーム送信で `schedules` が `(facility_id, published_month)` でUPSERTされる（新規作成/更新の両方）
    - [x] `instagram_post_url` と `published_month` のバリデーション（形式不正で 400、クエリ/フラグメントは保存時に除去して正規化）
    - [x] `image_url`（DB必須）はサーバー側で補完し、MVP UIに影響しない（既存運用に合わせ `instagram_post_url` と同値で補完）
    - [x] Runbook（`docs/04-development.md` 9.6）に「Cursor不要の登録手順（スマホ/PC）」が追記されている
  - 補足:
    - MVPでは「自分だけ」が使う前提のため、Supabase Auth導入は行わない（必要になったら別タスク）
    - 投稿URLの候補検索（CSE）はこのセッションでは必須にしない（次回候補）

### 関連ドキュメント

- 参照:
  - `docs/05-00-development-phases.md`（フェーズ10の位置づけ、dev-sessions運用ルール）
  - `docs/05-10-schedule-url-coverage.md`（フェーズ10の正本。MVPは手動登録で完了）
  - `docs/phase-artifacts/10-schedule-url-coverage/README.md`（正本/ログ/添付資料の優先順位）
  - `docs/02-design.md`（`schedules` テーブル定義、`UNIQUE (facility_id, published_month)`）
  - `docs/03-api.md`（`image_url` はDB必須だがMVP UIでは未使用、`instagram_post_url` が主）
  - `docs/04-development.md`（9.6: 既存の手動登録Runbook）
  - `apps/web/lib/types.ts`（`Schedule` 型）
  - `apps/web/lib/facilities.ts`（施設一覧取得、キャッシュ）
  - `apps/web/lib/date-utils.ts`（月の正規化ユーティリティ）
  - `apps/web/app/api/instagram-schedule-search/route.ts`（内部APIの保護パターン: `ADMIN_API_TOKEN`）

## 前提・合意事項（事前議論・壁打ちメモ）

- 今日のセッションで前提とする方針:
  - 目的は「Cursorを開かずに、スマホから `instagram_post_url` を登録できる」こと
  - DBの `service_role` はクライアントへ露出させず、**サーバー側API**でのみ使用する
  - 画面/APIは **Basic認証**で保護し、公開悪用を避ける（Google CSEのような課金リスクも将来に備えて遮断）
- 議論概要:
  - 案の比較（フォーム / LINE / ショートカット / ブックマークレット 等）を行い、「スマホ設定を増やしたくない」ためフォーム案を採用
  - Auth（Magic Link）は正統派だが導入コストが増えるため、MVP運用（自分だけ）では見送り
- 保留中の論点 / 今回は触らないと決めたこと:
  - 一般ユーザーや施設担当者が登録できる仕組み（スパム・監査・認可が必要になるため）
  - 候補URLの自動検索/提案（CSE連携のUI。まずはペースト登録を最短で）

---

## 実装チェックリスト（本セッションにおける）

### 1. 作業タスク & 実行内容（実装・ドキュメント更新）

- [x] タスク1: Basic認証の適用範囲（`/admin/*` と `/api/admin/*`）を決め、Next.js Middlewareで保護する
  - 完了条件: `apps/web/middleware.ts` が追加され、対象パスが 401（`WWW-Authenticate` 付き）で守られている
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - docs/04-development.md（環境変数の扱い）
      - apps/web/app/api/instagram-schedule-search/route.ts（内部APIの保護パターン）
    - やりたいこと:
      - Next.js middlewareで `/admin/:path*` と `/api/admin/:path*` を Basic 認証で保護する
      - 認証情報は server-only env（例: ADMIN_BASIC_AUTH_USER / ADMIN_BASIC_AUTH_PASSWORD）に置く
      - 認証失敗時は 401 + `WWW-Authenticate: Basic realm="CSH Admin"`
    - 制約・注意点:
      - 認証情報をログ出力しない
      - 既存の公開ルート（トップ/施設/お気に入り/既存API）に影響しない matcher にする
    ```

- [x] タスク2: サーバー側の「スケジュールURL登録API（UPSERT）」を実装する
  - 完了条件: `POST /api/admin/schedules/upsert`（仮）で `facility_id + month + instagram_post_url` を受け取り、`schedules` がUPSERTされる
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - docs/02-design.md（schedulesの制約）
      - docs/03-api.md（image_urlダミー可）
      - apps/web/lib/types.ts（Schedule型）
      - apps/web/lib/date-utils.ts（月の正規化）
    - やりたいこと:
      - service roleでSupabaseへ接続する server-only client（例: lib/supabase-admin.ts）を追加
      - 入力検証:
        - facility_id: UUID
        - month: YYYY-MM（→ published_month を YYYY-MM-01 に正規化）
        - instagram_post_url: `https://(www.)?instagram.com/(p|reel)/.../` 形式（クエリ/フラグメントは保存時に除去して正規化）
      - upsert:
        - onConflict: `facility_id,published_month`
        - image_url: `instagram_post_url` と同値で補完（既存運用に合わせ、NOT NULL制約に対応）
        - status: `published`（MVP方針）
        - notes: 任意で保存
      - 返却:
        - 200: upsertしたSchedule（またはid等の最小情報）
        - 400/401/500: 統一フォーマットで返す
    - 制約・注意点:
      - service role key をクライアントへ露出させない
      - DBのユニーク制約（facility_id, published_month）前提で冪等にする
    ```

- [x] タスク3: スマホ向け管理フォームを実装し、Runbookを更新する
  - 完了条件: `/admin/schedules/new`（仮）から登録でき、`docs/04-development.md` に手順が追記されている
  - **AIが実行する内容（手順/プロンプト/操作メモ）**:
    ```
    - 参照ファイル:
      - apps/web/lib/facilities.ts（施設一覧取得）
      - apps/web/components/*（既存の見た目に寄せるための参考）
      - docs/04-development.md（手動登録Runbook）
      - apps/web/env.local.example（env追加）
    - やりたいこと:
      - 管理画面（例: app/admin/schedules/new/page.tsx）にフォームを追加
        - 施設: datalist/検索（まずは getFacilities() で全件を選ばせる）
        - 月: YYYY-MM（デフォルトは当月。UIはシンプルに）
        - URL: instagram_post_url（貼り付け）
        - notes: 任意
      - 送信でタスク2のAPIを叩き、成功/失敗を画面表示
      - Runbook更新: 「スマホ/PCでの登録手順（Basic認証・URL貼付・確認方法）」を追記
      - env例の更新: ADMIN_BASIC_AUTH_USER / ADMIN_BASIC_AUTH_PASSWORD を `env.local.example` に追記
    - 制約・注意点:
      - フォームから service role を使わない（API経由のみ）
      - 公開URLを前提にするため、パスは推測しにくくしない（認証で守る）
    ```

### 2. 検証・テスト（確認方法）

- [x] 確認1: Basic認証が有効（未認証→401、認証→フォーム表示）
      - 期待結果: `/admin/schedules/new` と `/api/admin/...` が保護され、他のページに影響しない
- [x] 確認2: 正常系（登録/更新）が動作
      - 期待結果: 同じ施設×月で2回送信すると更新になり、DB上で1件に収束する
- [x] 確認3: 異常系（URL形式不正、month不正、facility_id不正）が 400 になる
      - 期待結果: 画面にエラーが表示され、DBは更新されない
- [x] 確認4: 最小の自動テスト/静的チェック（可能なら）
      - 期待結果:
        - `mise exec -- pnpm --filter web test`
        - `mise exec -- pnpm --filter web typecheck`

---

## 実施ログ

- スタート: N/A（AI自律で分割作業）
- メモ:
  - 実装ブランチ: feat/admin-schedule-url-form
  - コミット: dad7ea2
  - 追加/更新ファイル（主要）:
    - apps/web/middleware.ts
    - apps/web/app/admin/schedules/new/*
    - apps/web/app/api/admin/schedules/upsert/route.ts
    - apps/web/lib/supabase-admin.ts
    - apps/web/__tests__/admin-schedules-upsert-route.test.ts
    - apps/web/__tests__/middleware-basic-auth.test.ts
    - apps/web/env.local.example
    - docs/04-development.md
  - 実行した確認:
    - mise exec -- pnpm --filter web test
    - mise exec -- pnpm --filter web typecheck

## 結果とふりかえり

> **チェックの付け方**: 完了したタスクは `- [x]` で列挙する。未完了のタスクは `- [ ]` のまま「次回に持ち越すタスク」へ移す。

- 完了できたタスク:
  - [x] タスク1: Next.js Middlewareで `/admin/*` と `/api/admin/*` をBasic認証で保護
  - [x] タスク2: `POST /api/admin/schedules/upsert` を実装（service role / 入力検証 / UPSERT）
  - [x] タスク3: `/admin/schedules/new` の管理フォームを実装し、Runbookとenv例を更新
- 未完了タスク / 想定外だったこと:
  - [ ] （特になし）
- 学び・次回改善したいこと:
  - スマホの「リンクをコピー」は `utm_*` 等のクエリが付くことが多いため、サーバー側でクエリ/フラグメントを除去して正規化するのが運用上安全
  - `schedules.image_url` は既存データで空に見えるケースがあったが、スキーマ上は NOT NULL のためAPI側で必ず補完する方が堅牢

## 次回に持ち越すタスク

> **運用（重要）**:
> - 持ち越しタスクの**正本は常に「最新のセッションファイル 1つ」に集約**する（= 次回は最新だけ見れば良い状態にする）
> - 次のセッションを作ったら、前回セッションの未完了タスクを **新しい（最新）セッション** のこのセクションへコピーする
> - 前回セッション側のこのセクションは、後日 **各行を `- [x] （持ち越し済み → ...）` に更新して凍結**する（ここに追記して増やさない）
> - 後日「漏れていたタスク」に気づいた場合は、**最新セッションにのみ追記**し、行末に `（漏れていたため追加: YYYY-MM-DD）` を付ける

- なし（持ち越しが無い場合）

***

## 付録（議論まとめ / 決定理由）

### 出てきた案

- 案A: **スマホ用の管理フォーム（Web）**でURLを登録（ブラウザで完結）
- 案B: LINE Bot にURLを送って登録（Webhook→DB）
- 案C: iOSショートカット/共有メニューから登録（Edge Function等にPOST）
- 案D: ブックマークレット/PWAで「いま見てるURL」を送る
- 案E: メール送信で登録

### 採用した案（A）と理由

- 「自分だけが登録」「即反映OK」「スマホ設定を増やしたくない」ため、**導線が単純なフォーム**が最適
- クライアントに `service_role` を置かずに済み、**サーバー側で安全にUPSERT**できる
- Supabase Auth（Magic Link）は将来的には正統派だが、MVP運用では導入/運用コストが増えるため見送り
- LINE/ショートカットはUXが強い一方、運用・公開・認可設計が増えるため、まずは最小のフォームで価値を出す


