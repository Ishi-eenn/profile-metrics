# profile-metrics

A minimal, `metrics`-style GitHub profile SVG generator built plugin-by-plugin.

Each plugin fetches its own data and returns one section; the runner isolates
failures so a single broken plugin never breaks the whole card. The output is a
single self-contained SVG (fonts via system stack, images inlined as base64) so
it renders correctly inside a GitHub `<img>` tag.

## Structure

```
src/
  types.ts        Plugin / Section contract
  github.ts       GraphQL client (global fetch)
  svg.ts          escaping + base64 image inlining
  render.ts       stacks sections into one SVG card
  index.ts        runs plugins with per-plugin error isolation
  plugins/
    header.ts     avatar + name + follower/repo counts
    languages.ts  stacked language bar + legend
```

## Run locally

```bash
npm install
GITHUB_TOKEN=$(gh auth token) METRICS_USER=<your-login> npm start
# -> writes metrics.svg
```

## Automate (GitHub Actions)

`.github/workflows/metrics.yml` runs daily, regenerates `metrics.svg`, and
publishes it to the dedicated `metrics-output` branch (`single-commit`, so that
branch never accumulates history and `main` stays code-only). Reference it from
your profile README:

```md
<img src="https://raw.githubusercontent.com/Ishi-eenn/profile-metrics/metrics-output/metrics.svg" width="100%" />
```

On pull requests the workflow only generates the SVG and uploads it as an
artifact — it does not publish, so `main` can be fully branch-protected.

## Add a plugin

1. Create `src/plugins/<name>.ts` exporting a `Plugin`.
2. Register it in the `plugins` array in `src/index.ts`.
