# テストドキュメント

このフォルダには、Childcare Schedule Hub のテストに関するドキュメントを配置します。

## 目的

テスト観点表やテスト設計資料を一元管理し、開発者がテストの全体像を把握しやすくすることを目的としています。

## 含まれるドキュメント

### [representative-flow.md](./representative-flow.md)

代表フロー「拠点一覧 → スケジュール表示 → お気に入り」のテスト観点表（等価分割・境界値）をまとめたドキュメントです。

**内容:**
- テスト観点表（Case ID、Input / Precondition、Expected Result など）
- 単体テスト・E2E テストとの対応関係
- 未カバー・要追加のテストケース
- テスト実行コマンド

**参照元:**
- [04 開発ガイド](../04-development.md) 5.6節（テスト戦略）

---

### [web-unit-test-perspectives.md](./web-unit-test-perspectives.md)

`apps/web` の単体テスト・結合テスト（Vitest）に関するテスト観点表です。

**内容:**
- `lib/`, `hooks/`, `components/`, `app/` に対する単体テスト観点表
- テスト実行コマンドとカバレッジ取得方法

**参照元:**
- [04 開発ガイド](../04-development.md) 5.6節（テスト戦略）
- `apps/web/__tests__/README.md`

---

## 運用方針

- 新しいテスト観点表やテスト設計資料は、このフォルダに追加します
- ファイル名は `*-test-perspectives.md` や `*-test-design.md` などの命名規則に従います
- 各ドキュメントは、[04 開発ガイド](../04-development.md) から参照されることを想定しています
- **コード側のディレクトリ（例: `apps/web/__tests__`）には、テスト観点表本体は置かず、
  必要に応じて本フォルダへのリンクだけを置く**ようにします

## テストコードの配置場所

テストドキュメントとは別に、テストコードは以下の場所に配置します：

- **単体テスト・結合テスト（Vitest）**: `apps/web/__tests__/`
  - 詳細は [`apps/web/__tests__/README.md`](../../apps/web/__tests__/README.md) を参照
- **E2E テスト（Playwright）**: `apps/web/tests/e2e/`
  - 詳細は [`apps/web/tests/README.md`](../../apps/web/tests/README.md) を参照

