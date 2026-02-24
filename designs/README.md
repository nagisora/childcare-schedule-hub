# デザイン（Pencil）

このディレクトリは [Pencil](https://pencil.dev) の `.pen` ファイルを管理するための場所です。

## 構成

- **`app.pen`** … メインアプリの画面・UIデザイン（保育スケジュールハブ）
- **`images/`** … デザインで参照する画像（相対パスで参照すること）
- **`codes/`** … デザインから生成したコードの配置先（任意）

## 運用メモ

- 1画面1ファイル程度に分けると、Pencil の動作や Git での管理がしやすいです。
- 画像は必ず `images/` 配下に置き、`.pen` 内では相対パス（例: `images/button-icon.png`）で参照してください。
- 保存は手動（Cmd/Ctrl + S）のため、こまめに保存・コミットすることを推奨します。

## 参考

- [.pen Files - Pencil Documentation](https://docs.pencil.dev/core-concepts/pen-files)
