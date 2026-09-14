import type { PluginContext } from "../../types";

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
