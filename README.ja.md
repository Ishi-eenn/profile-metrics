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
  index.ts          オーケストレーション（取得 → 描画 → 書き出し・エラー隔離）
  types.ts          Plugin / Section / context の型（契約）
  github.ts         GraphQL + REST クライアント（グローバル fetch）
  svg.ts            エスケープ + 画像の base64 インライン化
  render/
    card.ts         各セクションを 1 枚の SVG カードに積み上げ
    terminal.ts     ray.so 風ターミナルウィンドウ（feature 非依存）
  features/         機能ごとに 1 フォルダで部品を co-locate:
    header/         fetch.ts · icons.ts · card.ts · terminal.ts
    activity/       fetch.ts · icons.ts · card.ts · terminal.ts
    repositories/   fetch.ts · icons.ts · card.ts · terminal.ts
    languages/      fetch.ts · card.ts · terminal.ts
```

各 feature フォルダは `index.ts` から、カードの `Plugin`（`card.ts`）、データ
取得（`fetch.ts`）、必要ならターミナルブロック（`terminal.ts`）を公開します。

出力画像は 2 枚です: `metrics.svg`（カード）と `terminal.svg`（languages +
activity を ray.so 風のターミナルウィンドウで描画）。どちらも出力ブランチに
publish されます:

```md
<img src="https://raw.githubusercontent.com/Ishi-eenn/profile-metrics/metrics-output/terminal.svg" width="480" />
```

## セクションの順序・表示/非表示

セクションの並びは `METRICS_ORDER`（プラグイン名のカンマ区切り）で決まります。
名前を**外せば非表示**になり、並び替えもコード変更なしで可能です:

```bash
METRICS_ORDER=header,languages,activity npm start   # activity ⇄ languages を入替
METRICS_ORDER=header,activity npm start             # languages を非表示
```

Activity の各行も `METRICS_ACTIVITY`（`commits,reviews,prs,issues,comments` の
任意の部分集合・順序）で制御できます:

```bash
METRICS_ACTIVITY=commits,prs,comments npm start     # この3行だけ表示
```

ターミナル画像は `METRICS_TERMINAL`（`profile,activity,repositories,languages` の任意の
部分集合・順序）で独立に制御できます:

```bash
METRICS_TERMINAL=languages npm start                # languages のみ
METRICS_TERMINAL=profile,languages npm start        # activity ブロックを外す
```

デフォルトは `METRICS_ORDER=header,activity,repositories,languages`、
`METRICS_ACTIVITY=commits,reviews,prs,issues,comments`、
`METRICS_TERMINAL=profile,activity,repositories,languages`。自動実行ではワークフローの
`Generate` ステップの `env:` で設定します。

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

### プライベート貢献（任意）

デフォルトではビルトインの `GITHUB_TOKEN` を使うため、**公開データのみ**が対象です
（commit / review / issue のカウントは公開分だけ）。プライベート貢献も数えたい
（metrics 相当の総数に合わせたい）場合は、`METRICS_TOKEN` という名前の
リポジトリシークレットに Personal Access Token を登録してください。存在すれば
ワークフローが自動的にそちらを使います。

## 機能を追加する

1. `src/features/<name>/` を作成し、`card.ts`（`Plugin` を export）と、必要に
   応じて `fetch.ts` / `terminal.ts` / `icons.ts`、そしてそれらを re-export する
   `index.ts` を置きます。
2. `src/index.ts` の `registry` に登録します（ターミナルブロックがある場合は
   `METRICS_TERMINAL` の処理にも組み込みます）。
