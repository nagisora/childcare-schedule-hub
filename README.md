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

## 開発資料
`docs/` ディレクトリに要件定義や設計資料を格納しています。
