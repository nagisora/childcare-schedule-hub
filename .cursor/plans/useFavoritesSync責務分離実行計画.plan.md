---
name: useFavoritesSync責務分離実行計画
overview: useFavoritesSync.ts が持つ「お気に入り状態管理（localStorage同期）」と「スケジュール取得・月管理」の責務を分離し、保守性とテスト容易性を向上させます。
todos:
  - id: extract-use-favorites-storage
    content: useFavoritesStorage フックを作成し、お気に入りのCRUDとlocalStorage同期ロジックを移動する
    status: completed
  - id: extract-use-facility-schedules
    content: useFacilitySchedules フックを作成し、スケジュール取得、選択月、ローディング・エラー状態の管理を移動する
    status: completed
  - id: refactor-use-favorites-sync
    content: useFavoritesSync を Facade フックとして再構築し、分離した2つのフックを合成する
    status: completed
  - id: run-tests
    content: 既存の __tests__/useFavoritesSync.test.ts およびその他テストがパスすることを確認・必要なら修正する
    status: completed
isProject: false
---

# `useFavoritesSync` 責務分離実行計画

## 背景・課題

現在 `apps/web/hooks/useFavoritesSync.ts` は400行を超え、以下の責務を抱え込んでいます（SRP違反）。

1. `favorites` リストの管理（localStorage との同期、追加・削除・並べ替え）
2. `schedules` データの取得（API通信）とローディング・エラー状態の管理
3. 各施設の「選択月（`selectedMonths`）」の管理

これにより、内部ロジックや副作用のタイミングが複雑に絡み合い、テストや機能拡張（お気に入り登録時の動作変更や、キャッシュ戦略の変更など）が難しくなっています。

## 解決方針

既存の `useFavoritesSync` の**外部インターフェース（戻り値）は可能な限り維持**しつつ（Facade化）、内部を独立したドメインごとのカスタムフックに分割します。

### 1. `useFavoritesStorage`（新規作成）

**責務:** お気に入りリストの管理と localStorage 同期

- **状態:** `favorites`
- **操作:** `handleRemove`, `handleMove`
- **副作用:** `storage` イベント / カスタムイベントの購読と同期

### 2. `useFacilitySchedules`（新規作成）

**責務:** スケジュールデータの取得、ローディング・エラー状態の管理、選択月の管理

- **状態:** `schedules`, `selectedMonths`, `loadingStates`, `errors`
- **操作:** `handleMonthChange`, `syncFacilities` (施設増減時のスケジュール取得・破棄)

### 3. `useFavoritesSync`（既存リファクタ・Facade化）

**責務:** 上記2つのフックを連携させるオーケストレーター

- `useFavoritesStorage` で現在の `favorites` (施設一覧) を取得
- 施設の増減があれば、`useFacilitySchedules` 側に通知して差分スケジュールを取得/破棄
- 既存のコンポーネント（`FavoritesSection` など）にこれまでと同じオブジェクトをそのまま返す

---

## 具体的なタスクリスト (1PR分)

1. `**useFavoritesStorage.ts` の実装**
  - localStorage 系ロジック（`getFavoritesFromStorageSnapshot`、`checkStorageChanges` など）と `favorites` 状態を抽出。
2. `**useFacilitySchedules.ts` の実装**
  - API通信ロジック（`fetchSchedules`）、状態（`schedules` / `selectedMonths` / `loadingStates` / `errors`）を抽出。
3. `**useFavoritesSync.ts` の更新（Facade化）**
  - 上記2つをインポートして組み合わせる処理に書き換える。
  - インターフェース崩れがないよう気を付ける。
4. **テストの実行・確認**
  - 既存の `useFavoritesSync.test.ts` が、Facade経由で今まで通りパスするか確認。
  - `pnpm --filter web test` の全件パスを確認。

## 確認用コマンド

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
```

