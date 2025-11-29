# apps/web/__tests__ について

このディレクトリには、`apps/web` の **単体テスト・結合テスト（Vitest）** を配置します。

## 対象

以下のディレクトリに対する `*.test.ts` / `*.test.tsx` ファイル：

- `app/`
- `components/`
- `hooks/`
- `lib/`

## ルール

- 新しい単体テスト・結合テストは **必ずこのディレクトリ直下** に追加する。
- `apps/web` 配下に **新しい `__tests__` ディレクトリを作らない**。
  - 例: `components/__tests__`, `hooks/__tests__` は作らない。
- テスト観点表やテスト設計ドキュメントは **コード側には置かない**。
  - ドキュメント本体は `docs/tests` に配置する。
  - 必要に応じて、このディレクトリには「どのドキュメントを参照するか」のリンクだけを書く。

## 関連ドキュメント

- テスト戦略・方針: [`docs/04-development.md`](../../../docs/04-development.md) 5.6節
- 単体テスト観点表: [`docs/tests/web-unit-test-perspectives.md`](../../../docs/tests/web-unit-test-perspectives.md)
- E2E テスト観点表: [`docs/tests/representative-flow.md`](../../../docs/tests/representative-flow.md)
- テストドキュメント一覧: [`docs/tests/README.md`](../../../docs/tests/README.md)

## テスト実行

```bash
# 単体テスト実行
pnpm test --filter web

# カバレッジ取得
pnpm test --filter web --coverage
```

