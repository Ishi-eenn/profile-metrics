import { promises as fs } from "node:fs";
import { makeGraphql } from "./github";
import { renderCard } from "./render";
import { headerPlugin } from "./plugins/header";
import { languagesPlugin } from "./plugins/languages";
import { activityPlugin } from "./plugins/activity";
import type { Plugin, PluginContext, Section } from "./types";

const user = process.env.METRICS_USER ?? "Ishi-eenn";
const token = process.env.GITHUB_TOKEN ?? process.env.TOKEN ?? "";
const output = process.env.METRICS_OUTPUT ?? "metrics.svg";

if (!token) {
  console.error("Missing token: set GITHUB_TOKEN (or TOKEN).");
  process.exit(1);
}

const ctx: PluginContext = {
  user,
  token,
  graphql: makeGraphql(token),
};

// Available plugins, keyed by name. Add one at a time.
const registry: Record<string, Plugin> = {
  header: headerPlugin,
  activity: activityPlugin,
  languages: languagesPlugin,
};

// Section order is configurable via METRICS_ORDER (comma-separated plugin
// names) — e.g. swap "activity" and "languages" without touching code.
const DEFAULT_ORDER = "header,activity,languages";
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

function errorSection(name: string): Section {
  return {
    height: 20,
    body: `<text x="0" y="14" class="error">⚠ ${name}: Unexpected error</text>`,
  };
}
