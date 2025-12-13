# web アプリ 単体テスト観点表

このドキュメントは、`apps/web` の単体テスト・結合テスト（Vitest）に関するテスト観点表です。

## 対象

`apps/web` 配下の以下のディレクトリに対する単体テスト：
- `lib/`
- `hooks/`
- `components/`
- `app/`

## 1. 単体テスト観点

### 1.1 `lib/facilities.ts` - `groupFacilitiesByArea` 関数

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|---------------------|--------------------------------------|-----------------|-------|
| TC-N-01 | 正常な拠点配列（複数エリア） | Equivalence – normal | エリア別にグルーピングされ、エリア名でソートされた配列を返す | - |
| TC-N-02 | 空の拠点配列 | Boundary – 空 | `{ areas: [], facilitiesByArea: {} }` を返す | - |
| TC-N-03 | 1件の拠点のみ | Boundary – 最小値 | 1つのエリアに1件の拠点を含むオブジェクトを返す | - |
| TC-N-04 | 同一エリアに複数拠点 | Equivalence – normal | 同一エリア内に複数の拠点が含まれる | - |
| TC-N-05 | エリア名が異なる拠点 | Equivalence – normal | エリア別に正しく分離される | - |
| TC-A-01 | null を渡す | Boundary – NULL | エラーが発生する（型エラー） | TypeScript で防止 |
| TC-A-02 | 不正な形式の配列要素 | Equivalence – abnormal | 不正な要素は無視され、有効な要素のみ処理される | 型チェック前提 |

### 1.2 `lib/storage.ts` - `addFavorite` 関数

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|---------------------|--------------------------------------|-----------------|-------|
| TC-N-01 | 空のお気に入り配列に追加 | Equivalence – normal | 1件のお気に入りが追加され、sortOrder=1 | - |
| TC-N-02 | 既存のお気に入り（4件）に追加 | Equivalence – normal | 5件目が追加され、sortOrder=5 | - |
| TC-A-01 | 既に登録されている facilityId | Equivalence – abnormal | 変更されず、元の配列を返す | - |
| TC-A-02 | 最大件数（5件）に達している | Boundary – 最大値 | 追加されず、元の配列を返す | - |
| TC-A-03 | 最大件数を超える（6件目を追加しようとする） | Boundary – 最大値+1 | 追加されず、元の配列を返す | - |
| TC-A-04 | 無効な facilityId（空文字列） | Equivalence – abnormal | 空文字列も有効なIDとして扱い、追加される | 業務ルールにより許容 |

**注:** 実装は `lib/storage.ts` に集約されている（以前は `lib/cookies.ts` として設計されていたが、localStorage ベースの実装に変更された）。

### 1.3 `lib/instagram-search.ts` - Instagram検索関連ユーティリティ（フェーズ9）

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|---------------------|--------------------------------------|-----------------|-------|
| TC-N-01 | 正常な施設名・区名でクエリ生成 | Equivalence – normal | 4つの優先順位付きクエリが生成される | - |
| TC-N-02 | 区名が null でクエリ生成 | Boundary – NULL | 区名を含むクエリは生成されず、施設名のみのクエリが生成される | - |
| TC-N-03 | 正常なプロフィールURLを正規化 | Equivalence – normal | `https://www.instagram.com/<username>/` 形式に統一される | - |
| TC-N-04 | `m.instagram.com` のURLを正規化 | Equivalence – normal | `www.instagram.com` に変換される | - |
| TC-N-05 | `http://` のURLを正規化 | Equivalence – normal | `https://` に変換される | - |
| TC-A-01 | 投稿URL（`/p/`）を正規化 | Equivalence – abnormal | `null` を返す（除外） | - |
| TC-A-02 | リールURL（`/reel/`）を正規化 | Equivalence – abnormal | `null` を返す（除外） | - |
| TC-A-03 | クエリパラメータ付きURL（`?igsh=`）を正規化 | Equivalence – abnormal | クエリパラメータが除去される | - |
| TC-A-04 | フラグメント付きURL（`#`）を正規化 | Equivalence – abnormal | フラグメントが除去される | - |
| TC-A-05 | Instagram以外のドメインを正規化 | Equivalence – abnormal | `null` を返す（除外） | - |
| TC-B-01 | スコア5点の候補 | Boundary – 閾値 | 採用される（5点以上） | - |
| TC-B-02 | スコア4点の候補 | Boundary – 閾値-1 | 採用されない（5点未満） | - |
| TC-B-03 | 施設名完全一致（+3点）+ 区名一致（+2点）+ プロフィールURL（+1点）= 6点 | Equivalence – normal | 採用される | - |
| TC-B-04 | 施設名部分一致（+2点）+ 名古屋（+1点）+ プロフィールURL（+1点）= 4点 | Boundary – 閾値-1 | 採用されない | - |
| TC-B-05 | 投稿URLを含む候補（-10点） | Equivalence – abnormal | スコアに関係なく除外される | - |
| TC-A-06 | 空文字列を正規化 | Boundary – 空 | `null` を返す | - |
| TC-A-07 | null を正規化 | Boundary – NULL | `null` を返す | - |
| TC-N-06 | 特殊文字（括弧・記号）を含む施設名でクエリ生成 | Equivalence – normal | エスケープされたクエリが生成される | - |

### 1.4 `lib/storage.ts` - `removeFavorite` 関数

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|---------------------|--------------------------------------|-----------------|-------|
| TC-N-01 | 存在する facilityId を削除 | Equivalence – normal | 該当するお気に入りが削除され、残りの sortOrder が再振り当てされる | - |
| TC-N-02 | 1件のみのお気に入りから削除 | Boundary – 最小値 | 空配列を返す | - |
| TC-A-01 | 存在しない facilityId | Equivalence – abnormal | 変更されず、元の配列を返す | - |
| TC-A-02 | 空配列から削除 | Boundary – 空 | 空配列を返す | - |

**注:** 実装は `lib/storage.ts` に集約されている。

### 1.4 `lib/storage.ts` - `reorderFavorites` 関数

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|---------------------|--------------------------------------|-----------------|-------|
| TC-N-01 | 正常な facilityIds 配列（順序変更） | Equivalence – normal | 指定された順序で sortOrder が更新される | - |
| TC-N-02 | 1件のみの並び替え | Boundary – 最小値 | sortOrder=1 のまま | - |
| TC-A-01 | 存在しない facilityId を含む配列 | Equivalence – abnormal | 存在しないIDは無視され、存在するもののみ処理される | - |
| TC-A-02 | 空の facilityIds 配列 | Boundary – 空 | 空配列を返す | - |

**注:** 実装は `lib/storage.ts` に集約されている。

### 1.5 `lib/storage.ts` - `readFavoritesFromStorage` / `updateFavoritesInStorage` 関数

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|---------------------|--------------------------------------|-----------------|-------|
| TC-N-01 | 正常なlocalStorage値（JSON配列） | Equivalence – normal | パースされたお気に入り配列を返す | - |
| TC-N-02 | localStorageが存在しない | Boundary – 空 | 空配列を返す | - |
| TC-A-01 | 不正なJSON形式のlocalStorage値 | Equivalence – abnormal | 空配列を返す（エラーハンドリング） | - |
| TC-A-02 | 不正な構造のオブジェクト | Equivalence – abnormal | 不正な要素はフィルタリングされ、有効なもののみ返す | - |
| TC-A-03 | 最大件数（5件）を超えるlocalStorage値 | Boundary – 最大値+1 | 最大5件までに制限される | - |

**注:** 実装は `lib/storage.ts` に集約されている。以前は `lib/cookies.ts` の `readFavoritesCookieClient` / `updateFavoritesCookieClient` として設計されていたが、localStorage ベースの実装に変更された。

### 1.6 `hooks/useFavoritesSync.ts` - お気に入りとスケジュール同期

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|---------------------|--------------------------------------|-----------------|-------|
| TC-N-01 | 初期ロード時にお気に入りが存在する | Equivalence – normal | 全お気に入りのスケジュールが読み込まれ、選択月が今月に設定される | - |
| TC-N-02 | 既存のお気に入りに1件追加する | Equivalence – normal | 既存施設のスケジュールが維持され、新規施設のスケジュールのみ追加される | - |
| TC-N-03 | お気に入りから1件削除する | Equivalence – normal | 削除された施設のスケジュールがクリアされ、残りの施設のスケジュールは維持される | - |
| TC-N-04 | 月切り替えボタンを1回クリックする | Equivalence – normal | 選択月が更新され、該当月のスケジュールが表示される | - |
| TC-A-01 | スケジュール取得APIが失敗する（初期ロード時） | Equivalence – abnormal | エラーログが出力され、スケジュールは空の状態になる | 外部依存の失敗 |
| TC-A-02 | スケジュール取得APIが失敗する（お気に入り追加時） | Equivalence – abnormal | 既存施設のスケジュールは維持され、新規施設のみスケジュールが取得されない | 外部依存の失敗 |
| TC-A-03 | スケジュール取得APIが失敗する（月切り替え時） | Equivalence – abnormal | 該当施設のスケジュールがクリアされ、他の施設のスケジュールは維持される | 外部依存の失敗 |
| TC-B-01 | 空のお気に入りリストから開始 | Boundary – 空 | お気に入り・スケジュール・選択月がすべて空の状態になる | - |
| TC-B-02 | 最大件数（5件）のお気に入りを管理 | Boundary – 最大値 | 5件すべてのスケジュールが正しく管理される | - |
| TC-R-01 | 同一施設で月切り替えを連続で2回実行（古いリクエストが後から完了） | Equivalence – abnormal | 最終的に選択されている月のスケジュールだけが表示される（レースコンディション対策） | - |
| TC-R-02 | 月切り替え中にスケジュール取得APIが失敗し、その後別の月に切り替えられる | Equivalence – abnormal | 最新の選択月のリクエストのみが処理され、古い月のエラー処理は無視される | - |

## 2. テスト実行コマンドとカバレッジ

### 単体テスト
```bash
pnpm test --filter web
```

### カバレッジ取得
```bash
pnpm test --filter web --coverage
```

### 型チェック
```bash
pnpm typecheck --filter web
```

### Lint
```bash
pnpm lint --filter web
```

## 関連ドキュメント

- テスト戦略・方針: [04 開発ガイド](../04-development.md) 5.6節
- E2E テスト観点表: [代表フローテスト観点表](./representative-flow.md)
- テストコードの場所: `apps/web/__tests__`

