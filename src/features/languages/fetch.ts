import { pages } from "../../github";
import type { PluginContext } from "../../types";

const TOP_N = 8;

export interface LanguageStat {
  name: string;
  color: string;
  pct: number;
}

interface Total {
  size: number;
  color: string;
}

/** Aggregates language weights across owned repositories into top-N percentages. */
export async function fetchLanguages(ctx: PluginContext): Promise<LanguageStat[]> {
  const commitWeighted = process.env.METRICS_LANGUAGES === "commits";
  const totals = commitWeighted ? await commitTotals(ctx) : await byteTotals(ctx);

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

/** Source bytes per language, summed over owned repositories. */
async function byteTotals(ctx: PluginContext): Promise<Map<string, Total>> {
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

  const totals = new Map<string, Total>();
  for await (const data of pages(ctx.graphql, query, { login: ctx.user }, (d) => d.user.repositories)) {
    for (const repo of data.user.repositories.nodes) {
      for (const edge of repo.languages.edges) {
        add(totals, edge.node.name, edge.node.color, edge.size);
      }
    }
  }
  return totals;
}

/**
 * Commits per language, summed over the account's lifetime. Each commit is
 * attributed to its repository's primary language, so this reflects where the
 * work went rather than how much source each repository happens to hold.
 * Repositories without a detected language are skipped.
 */
async function commitTotals(ctx: PluginContext): Promise<Map<string, Total>> {
  const { user } = await ctx.graphql(
    `query($login: String!) { user(login: $login) { createdAt } }`,
    { login: ctx.user },
  );

  // contributionsCollection spans at most one year, so query one slice per year.
  const years = yearsSince(user.createdAt);
  const slices = years
    .map(
      (year) => `y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") {
        commitContributionsByRepository(maxRepositories: 100) {
          contributions { totalCount }
          repository { primaryLanguage { name color } }
        }
      }`,
    )
    .join("\n");

  const data = await ctx.graphql(
    `query($login: String!) { user(login: $login) { ${slices} } }`,
    { login: ctx.user },
  );

  const totals = new Map<string, Total>();
  for (const slice of Object.values<any>(data.user)) {
    for (const entry of slice.commitContributionsByRepository) {
      const lang = entry.repository.primaryLanguage;
      if (!lang) continue;
      add(totals, lang.name, lang.color, entry.contributions.totalCount);
    }
  }
  return totals;
}

/** Every calendar year the account has existed, oldest first. */
export function yearsSince(createdAt: string, now = new Date()): number[] {
  const first = new Date(createdAt).getUTCFullYear();
  const last = now.getUTCFullYear();
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

function add(totals: Map<string, Total>, name: string, color: string | null, size: number): void {
  const entry = totals.get(name) ?? { size: 0, color: color ?? "#858585" };
  entry.size += size;
  totals.set(name, entry);
}
