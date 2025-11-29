# Childcare Schedule Hub

名古屋市の子育て拠点スケジュールを一元管理するウェブアプリケーションの開発プロジェクトです。

## セットアップ

開発ツールのバージョン管理は mise を利用します。Node.js と pnpm は `mise.toml` に定義されています。

1) 初回のみ（信頼設定）
```bash
mise trust -y mise.toml
```

2) ツールのインストール
```bash
mise install
```

3) 依存インストール（パッケージ構成が揃っている場合）
```bash
mise exec -- pnpm install
```

## 開発サーバーの起動

開発サーバーを起動するには、以下のコマンドを実行してください：

```bash
mise exec -- pnpm --filter web dev
```

開発サーバーは `http://localhost:3000` で起動します。

その他のコマンド（ビルド、テスト、型チェックなど）については、`apps/web/package.json` の `scripts` セクションを参照してください。

## テスト

### テストの構造

テストは以下の場所に配置されています：

- **単体テスト・結合テスト（Vitest）**: `apps/web/__tests__/`
  - `lib/`, `hooks/`, `components/`, `app/` に対する `*.test.ts` / `*.test.tsx` ファイル
- **E2E テスト（Playwright）**: `apps/web/tests/e2e/`
  - 代表フローや画面遷移を対象とした `*.spec.ts` ファイル
- **テストドキュメント**: `docs/tests/`
  - テスト観点表やテスト設計資料を一元管理

### 重要なルール

- 新しいテストは、上記の配置場所に追加してください
- **新しい `__tests__` や `tests` ディレクトリは作成しないでください**
- テスト観点表は `docs/tests` に配置し、コード側にはリンクのみを置きます

詳細は各ディレクトリの README を参照してください：
- [`apps/web/__tests__/README.md`](apps/web/__tests__/README.md)
- [`apps/web/tests/README.md`](apps/web/tests/README.md)
- [`docs/tests/README.md`](docs/tests/README.md)

### テスト実行コマンド

```bash
# 単体テスト実行
mise exec -- pnpm --filter web test

# 単体テスト（カバレッジ取得）
mise exec -- pnpm --filter web test:coverage

# E2E テスト実行
mise exec -- pnpm --filter web e2e

# 型チェック
mise exec -- pnpm --filter web typecheck

# Lint
mise exec -- pnpm --filter web lint
```

## 開発資料

`docs/` ディレクトリに要件定義や設計資料を格納しています。

- 要件定義・設計資料: [`docs/01-requirements.md`](docs/01-requirements.md), [`docs/02-design.md`](docs/02-design.md)
- 開発ガイド: [`docs/04-development.md`](docs/04-development.md)
- テストドキュメント: [`docs/tests/README.md`](docs/tests/README.md)
