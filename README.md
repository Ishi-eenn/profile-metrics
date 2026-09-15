# profile-metrics

**English** | [日本語](README.ja.md)

A minimal, `metrics`-style GitHub profile SVG generator built plugin-by-plugin.

Each plugin fetches its own data and returns one section; the runner isolates
failures so a single broken plugin never breaks the whole card. The output is a
single self-contained SVG (fonts via system stack, images inlined as base64) so
it renders correctly inside a GitHub `<img>` tag.

## Structure

```
src/
  index.ts          orchestration (fetch → render → write, error isolation)
  types.ts          Plugin / Section / context contracts
  github.ts         GraphQL + REST clients (global fetch)
  svg.ts            escaping + base64 image inlining
  render/
    card.ts         stacks sections into one SVG card
    terminal.ts     ray.so-style terminal window (feature-agnostic)
  features/         one folder per feature, co-locating its pieces:
    header/         fetch.ts · icons.ts · card.ts · terminal.ts
    activity/       fetch.ts · icons.ts · card.ts · terminal.ts
    repositories/   fetch.ts · icons.ts · card.ts · terminal.ts
    languages/      fetch.ts · card.ts · terminal.ts
```

Each feature folder exposes (via its `index.ts`): a card `Plugin` (`card.ts`), a
data fetcher (`fetch.ts`), and optionally a terminal block (`terminal.ts`).

Two images are produced: `metrics.svg` (the card) and `terminal.svg` (a
ray.so-style terminal window rendering languages + activity). Both are published
to the output branch:

```md
<img src="https://raw.githubusercontent.com/Ishi-eenn/profile-metrics/metrics-output/terminal.svg" width="480" />
```

## Card layout

The card is laid out by `METRICS_ORDER`: `,` orders sections (omit a name to
**hide** it), and `|` splits the card into side-by-side columns:

```bash
METRICS_ORDER="header,activity,repositories,languages" npm start  # single column
METRICS_ORDER="header,activity | repositories,languages" npm start  # two columns
METRICS_ORDER=header,activity npm start                           # hide the rest
```

Activity rows are likewise controlled by `METRICS_ACTIVITY` (any subset/order of
`commits,reviews,prs,issues,comments`):

```bash
METRICS_ACTIVITY=commits,prs,comments npm start     # only these three rows
```

The terminal image is controlled by `METRICS_TERMINAL`: `,` orders blocks
(`profile,activity,repositories,languages`), and `|` splits the window into
side-by-side panes (tmux-style):

```bash
METRICS_TERMINAL=languages npm start                                    # languages only
METRICS_TERMINAL="profile,activity | repositories,languages" npm start  # two panes
METRICS_TERMINAL="languages | profile" npm start                        # right/left order
```

Defaults: `METRICS_ORDER=header,activity | repositories,languages`,
`METRICS_ACTIVITY=commits,reviews,prs,issues,comments`,
`METRICS_TERMINAL=profile,activity | repositories,languages`. Set them in the
workflow's `Generate` step `env:` for automated runs.

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

### Private contributions (optional)

By default the workflow uses the built-in `GITHUB_TOKEN`, which only sees
**public** data — so the commit / review / issue counts reflect public activity
only. To count private contributions too (and match a metrics-style total), add
a Personal Access Token as a repository secret named `METRICS_TOKEN`; the
workflow uses it automatically when present.

## Add a feature

1. Create `src/features/<name>/` with `card.ts` (exporting a `Plugin`) and,
   as needed, `fetch.ts` / `terminal.ts` / `icons.ts`, plus an `index.ts`
   re-exporting them.
2. Register the plugin in `registry` in `src/index.ts` (and, if it has a
   terminal block, wire it into the `METRICS_TERMINAL` handling there).
