import type { Plugin, PluginContext } from "../types";
import { escapeXml } from "../svg";
import { CONTENT_WIDTH } from "../render";

const TOP_N = 8;

export interface LanguageStat {
  name: string;
  color: string;
  pct: number;
}

/** Aggregates language bytes across owned repositories into top-N percentages. */
export async function fetchLanguages(ctx: PluginContext): Promise<LanguageStat[]> {
  const data = await ctx.graphql(
    `query($login: String!) {
      user(login: $login) {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
          nodes {
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges { size node { name color } }
            }
          }
        }
      }
    }`,
    { login: ctx.user },
  );

  const totals = new Map<string, { size: number; color: string }>();
  for (const repo of data.user.repositories.nodes) {
    for (const edge of repo.languages.edges) {
      const entry = totals.get(edge.node.name) ?? {
        size: 0,
        color: edge.node.color ?? "#858585",
      };
      entry.size += edge.size;
      totals.set(edge.node.name, entry);
    }
  }

  const sorted = [...totals.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, TOP_N);
  const grand = sorted.reduce((sum, [, v]) => sum + v.size, 0) || 1;

  return sorted.map(([name, v]) => ({
    name,
    color: v.color,
    pct: (v.size / grand) * 100,
  }));
}

/** Stacked language bar + legend, aggregated across owned repositories. */
export const languagesPlugin: Plugin = {
  name: "languages",
  async run(ctx) {
    const langs = await fetchLanguages(ctx);

    let x = 0;
    const bar: string[] = [];
    for (const lang of langs) {
      const w = (lang.pct / 100) * CONTENT_WIDTH;
      bar.push(`<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="8" fill="${lang.color}" />`);
      x += w;
    }

    const legend = langs.map((lang, i) => {
      const lx = (i % 2) * (CONTENT_WIDTH / 2);
      const ly = 28 + Math.floor(i / 2) * 20;
      return `
        <circle cx="${lx + 6}" cy="${ly - 4}" r="6" fill="${lang.color}" />
        <text x="${lx + 18}" y="${ly}" class="value">${escapeXml(lang.name)} <tspan class="muted">${lang.pct.toFixed(1)}%</tspan></text>`;
    });

    const rows = Math.ceil(langs.length / 2);
    return {
      title: "Most used languages",
      height: 16 + rows * 20,
      body: `
        <clipPath id="bar-clip"><rect x="0" y="0" width="${CONTENT_WIDTH}" height="8" rx="4" /></clipPath>
        <g clip-path="url(#bar-clip)">
          <rect x="0" y="0" width="${CONTENT_WIDTH}" height="8" fill="#eaecef" />
          ${bar.join("")}
        </g>
        ${legend.join("")}`,
    };
  },
};
