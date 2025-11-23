# テスト観点表（フェーズ3 代表フロー）

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

### 1.3 `lib/storage.ts` - `removeFavorite` 関数

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

## 2. E2E テスト観点（代表フロー）

### 2.1 代表フロー: 拠点一覧 → お気に入り追加 → お気に入りエリアに反映

| Case ID | Input / Precondition | Perspective (Equivalence / Boundary) | Expected Result | Notes |
|---------|---------------------|--------------------------------------|-----------------|-------|
| TC-E2E-01 | トップページにアクセス | Equivalence – normal | 拠点一覧が表示され、お気に入りエリアが空（エンプティステート） | - |
| TC-E2E-02 | 「+」ボタンをクリックして1件追加 | Equivalence – normal | お気に入りエリアに追加された拠点が表示される | - |
| TC-E2E-03 | 最大5件までお気に入りを追加 | Boundary – 最大値 | 5件すべてがお気に入りエリアに表示される | - |
| TC-E2E-04 | 6件目を追加しようとする | Boundary – 最大値+1 | エラーメッセージが表示され、追加されない | - |
| TC-E2E-05 | 既に追加済みの拠点を再度追加しようとする | Equivalence – abnormal | 「追加済み」と表示され、ボタンが無効化される | - |
| TC-E2E-06 | お気に入りから「解除」ボタンをクリック | Equivalence – normal | 該当のお気に入りが削除され、一覧に「+」ボタンが再表示される | - |
| TC-E2E-07 | お気に入りカードから拠点詳細ページへ遷移 | Equivalence – normal | `/facilities/[id]` ページに遷移し、拠点情報が表示される | - |
| TC-A-E2E-01 | Supabase 接続エラー時 | Equivalence – abnormal | エラーメッセージが表示される（またはフォールバック表示） | 外部依存の失敗 |

## 3. テスト実行コマンドとカバレッジ

### 単体テスト
```bash
pnpm test --filter web
```

### カバレッジ取得
```bash
pnpm test --filter web --coverage
```

### E2E テスト
```bash
pnpm e2e --filter web
```

### 型チェック
```bash
pnpm typecheck --filter web
```

### Lint
```bash
pnpm lint --filter web
```

