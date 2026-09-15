import type { PluginContext } from "../../types";

export interface RepoStats {
  repositories: number;
  license: string;
  releases: number;
  packages: number;
  disk: string; // e.g. "286 MB"
  linesAdded: number;
  linesRemoved: number;
  sponsors: number;
  stargazers: number;
  forkers: number;
  watchers: number;
  languages: number;
}

/** "5.56m" / "142k" / "530" */
export function humanNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** KB → "286 MB" / "1.20 GB" */
function humanDisk(kb: number): string {
  const mb = kb / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${Math.round(mb)} MB`;
}

/** Sums the user's own additions/deletions across repos (best-effort). */
async function fetchLines(
  ctx: PluginContext,
  repos: string[],
): Promise<{ added: number; removed: number }> {
  const login = ctx.user.toLowerCase();
  const results = await Promise.allSettled(
    repos.map((name) => ctx.rest(`/repos/${ctx.user}/${name}/stats/contributors`)),
  );
  let added = 0;
  let removed = 0;
  for (const result of results) {
    if (result.status !== "fulfilled" || !Array.isArray(result.value)) continue;
    for (const contributor of result.value) {
      if (contributor?.author?.login?.toLowerCase() !== login) continue;
      for (const week of contributor.weeks ?? []) {
        added += week.a ?? 0;
        removed += week.d ?? 0;
      }
    }
  }
  return { added, removed };
}

/** Aggregate lifetime repository stats across owned repositories. */
export async function fetchRepositories(ctx: PluginContext): Promise<RepoStats> {
  const data = await ctx.graphql(
    `query($login: String!) {
      user(login: $login) {
        sponsors { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          totalCount
          nodes {
            name
            licenseInfo { nickname name }
            releases { totalCount }
            packages { totalCount }
            diskUsage
            stargazerCount
            forkCount
            watchers { totalCount }
            languages(first: 20) { nodes { name } }
          }
        }
      }
    }`,
    { login: ctx.user },
  );

  const nodes: any[] = data.user.repositories.nodes;

  const licenses = new Map<string, number>();
  const languages = new Set<string>();
  let releases = 0;
  let packages = 0;
  let diskKb = 0;
  let stargazers = 0;
  let forkers = 0;
  let watchers = 0;

  for (const repo of nodes) {
    releases += repo.releases.totalCount;
    packages += repo.packages.totalCount;
    diskKb += repo.diskUsage ?? 0;
    stargazers += repo.stargazerCount;
    forkers += repo.forkCount;
    watchers += repo.watchers.totalCount;
    for (const lang of repo.languages.nodes) languages.add(lang.name);
    if (repo.licenseInfo) {
      const key = repo.licenseInfo.nickname ?? repo.licenseInfo.name;
      licenses.set(key, (licenses.get(key) ?? 0) + 1);
    }
  }

  const topLicense = [...licenses.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const lines = await fetchLines(ctx, nodes.map((r) => r.name));

  return {
    repositories: data.user.repositories.totalCount,
    license: topLicense ?? "No license preference",
    releases,
    packages,
    disk: humanDisk(diskKb),
    linesAdded: lines.added,
    linesRemoved: lines.removed,
    sponsors: data.user.sponsors.totalCount,
    stargazers,
    forkers,
    watchers,
    languages: languages.size,
  };
}
