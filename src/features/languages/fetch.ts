import { pages } from "../../github";
import type { PluginContext } from "../../types";

const TOP_N = 8;

export interface LanguageStat {
  name: string;
  color: string;
  pct: number;
}

/** Aggregates language bytes across owned repositories into top-N percentages. */
export async function fetchLanguages(ctx: PluginContext): Promise<LanguageStat[]> {
  const query = `query($login: String!, $endCursor: String) {
    user(login: $login) {
      repositories(first: 100, after: $endCursor, ownerAffiliations: OWNER, isFork: false) {
        pageInfo { hasNextPage endCursor }
        nodes {
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges { size node { name color } }
          }
        }
      }
    }
  }`;

  const totals = new Map<string, { size: number; color: string }>();
  for await (const data of pages(ctx.graphql, query, { login: ctx.user }, (d) => d.user.repositories)) {
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
