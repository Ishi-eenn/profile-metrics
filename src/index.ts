import { promises as fs } from "node:fs";
import { makeGraphql, makeRest } from "./github";
import { renderCard } from "./render/card";
import { renderTerminal, type Line } from "./render/terminal";
import { headerPlugin, profileLines, fetchProfile } from "./features/header";
import { languagesPlugin, languageLines, fetchLanguages } from "./features/languages";
import { activityPlugin, activityLines, fetchActivity } from "./features/activity";
import { repositoriesPlugin, repositoryLines, fetchRepositories } from "./features/repositories";
import type { Plugin, PluginContext, Section } from "./types";

const user = process.env.METRICS_USER ?? "Ishi-eenn";
const token = process.env.GITHUB_TOKEN ?? process.env.TOKEN ?? "";
const output = process.env.METRICS_OUTPUT ?? "metrics.svg";
const terminalOutput = process.env.METRICS_TERMINAL_OUTPUT ?? "terminal.svg";

if (!token) {
  console.error("Missing token: set GITHUB_TOKEN (or TOKEN).");
  process.exit(1);
}

const ctx: PluginContext = {
  user,
  token,
  graphql: makeGraphql(token),
  rest: makeRest(token),
};

// Available card plugins, keyed by name. Add one at a time.
const registry: Record<string, Plugin> = {
  header: headerPlugin,
  activity: activityPlugin,
  repositories: repositoriesPlugin,
  languages: languagesPlugin,
};

// Card section order is configurable via METRICS_ORDER (comma-separated plugin
// names) — reorder or drop sections (omit a name to hide it).
const DEFAULT_ORDER = "header,activity,repositories,languages";
const plugins: Plugin[] = (process.env.METRICS_ORDER ?? DEFAULT_ORDER)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)
  .map((name) => {
    if (!registry[name]) console.warn(`unknown plugin in METRICS_ORDER: ${name}`);
    return registry[name];
  })
  .filter((plugin): plugin is Plugin => Boolean(plugin));

const sections: Section[] = [];
for (const plugin of plugins) {
  try {
    console.log(`plugin ${plugin.name} > started`);
    sections.push(await plugin.run(ctx));
    console.log(`plugin ${plugin.name} > done`);
  } catch (error) {
    // Error isolation: one broken plugin never breaks the whole card.
    console.error(`plugin ${plugin.name} > error:`, error);
    sections.push(errorSection(plugin.name));
  }
}

const svg = renderCard(sections);
await fs.writeFile(output, svg, "utf8");
console.log(`Wrote ${output} (${svg.length} bytes) for @${user}`);

// Terminal-style image (ray.so-like). METRICS_TERMINAL controls which blocks
// appear and in what order — e.g. "languages" for languages only, or
// "languages,activity" to swap. Omit a name to hide that block.
try {
  const blockLines = async (name: string): Promise<Line[] | null> => {
    if (name === "profile") return profileLines(await fetchProfile(ctx));
    if (name === "activity") return activityLines(await fetchActivity(ctx));
    if (name === "repositories") return repositoryLines(await fetchRepositories(ctx));
    if (name === "languages") return languageLines(await fetchLanguages(ctx));
    console.warn(`unknown block in METRICS_TERMINAL: ${name}`);
    return null;
  };

  // METRICS_TERMINAL: "|" splits side-by-side panes; "," orders blocks in a pane.
  const paneSpecs = (process.env.METRICS_TERMINAL ?? "profile,activity | repositories,languages")
    .split("|")
    .map((pane) => pane.split(",").map((n) => n.trim()).filter(Boolean))
    .filter((pane) => pane.length);

  const panes: Line[][] = [];
  for (const spec of paneSpecs) {
    const lines: Line[] = [];
    for (const name of spec) {
      const block = await blockLines(name);
      if (!block) continue;
      if (lines.length) lines.push("");
      lines.push(...block);
    }
    if (lines.length) panes.push(lines);
  }

  const terminal = renderTerminal({ user, panes });
  await fs.writeFile(terminalOutput, terminal, "utf8");
  console.log(`Wrote ${terminalOutput} (${terminal.length} bytes)`);
} catch (error) {
  console.error("terminal > error:", error);
}

function errorSection(name: string): Section {
  return {
    height: 20,
    body: `<text x="0" y="14" class="error">⚠ ${name}: Unexpected error</text>`,
  };
}
