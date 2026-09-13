# profile-metrics

[English](README.md) | **日本語**

`metrics` ライクな GitHub プロフィール用 SVG ジェネレーターを、プラグイン単位で
組み立てるミニマル実装です。

各プラグインは自身でデータを取得し、1 つのセクションを返します。ランナーが
プラグインごとに失敗を隔離するため、1 つのプラグインが壊れてもカード全体が
壊れることはありません。出力は単一の自己完結した SVG（フォントはシステム
フォントスタック、画像は base64 でインライン埋め込み）なので、GitHub の
`<img>` タグ内でも正しく表示されます。

## 構成

```
src/
  types.ts        Plugin / Section の型（契約）
  github.ts       GraphQL クライアント（グローバル fetch）
  svg.ts          エスケープ + 画像の base64 インライン化
  render.ts       各セクションを 1 枚の SVG カードに積み上げ
  index.ts        プラグインをエラー隔離しつつ実行
  plugins/
    header.ts     アバター + 名前 + フォロワー/リポジトリ数
    languages.ts  言語の積み上げバー + 凡例
```

## ローカル実行

```bash
npm install
GITHUB_TOKEN=$(gh auth token) METRICS_USER=<あなたのログイン名> npm start
# -> metrics.svg を書き出します
```

## 自動化（GitHub Actions）

`.github/workflows/metrics.yml` が毎日実行され、`metrics.svg` を再生成して
専用の `metrics-output` ブランチへ publish します（`single-commit` なので
このブランチに履歴が積もらず、`main` はコードだけのまま保たれます）。
プロフィールの README からは次のように参照します:

```md
<img src="https://raw.githubusercontent.com/Ishi-eenn/profile-metrics/metrics-output/metrics.svg" width="100%" />
```

プルリクエストでは SVG の生成と artifact へのアップロードのみを行い、publish は
しません。そのため `main` にブランチ保護をかけたまま運用できます。

## プラグインを追加する

1. `src/plugins/<name>.ts` を作成し、`Plugin` を export します。
2. `src/index.ts` の `plugins` 配列に登録します。
