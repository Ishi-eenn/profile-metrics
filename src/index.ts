import { promises as fs } from "node:fs";
import { makeGraphql } from "./github";
import { renderCard } from "./render";
import { headerPlugin } from "./plugins/header";
import { languagesPlugin } from "./plugins/languages";
import type { Plugin, PluginContext, Section } from "./types";

const user = process.env.METRICS_USER ?? "Ishi-eenn";
const token = process.env.GITHUB_TOKEN ?? process.env.TOKEN ?? "";
const output = process.env.METRICS_OUTPUT ?? "metrics.svg";

if (!token) {
  console.error("Missing token: set GITHUB_TOKEN (or TOKEN).");
  process.exit(1);
}

const ctx: PluginContext = { user, token, graphql: makeGraphql(token) };

// Register plugins here — add one at a time.
const plugins: Plugin[] = [headerPlugin, languagesPlugin];

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
