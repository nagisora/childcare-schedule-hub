# apps/web/tests について

このディレクトリは **E2E テスト（Playwright）専用** です。

- 実行設定は `playwright.config.ts` の `testDir: "./tests/e2e"` に対応しています。
- テストファイルは `tests/e2e/*.spec.ts` に配置します。

## ルール

- **E2E テスト以外（Vitest の単体テストなど）はここに置かない**。
  - 単体テスト・結合テストは `apps/web/__tests__` に配置する。
- `tests` 配下に新しいサブディレクトリ種別（例: `tests/integration`）は作らない。
  - Web アプリの E2E テストはすべて `tests/e2e` に集約する。

## 関連ドキュメント

- テスト戦略・方針: [`docs/04-development.md`](../../../docs/04-development.md) 5.6節
- E2E テスト観点表: [`docs/tests/representative-flow.md`](../../../docs/tests/representative-flow.md)
- 単体テスト観点表: [`docs/tests/web-unit-test-perspectives.md`](../../../docs/tests/web-unit-test-perspectives.md)
- テストドキュメント一覧: [`docs/tests/README.md`](../../../docs/tests/README.md)

## テスト実行

```bash
# E2E テスト実行
pnpm e2e --filter web

# UI モードで実行
pnpm e2e:ui --filter web
```

