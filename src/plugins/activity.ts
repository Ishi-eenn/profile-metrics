import type { Plugin, PluginContext } from "../types";
import { escapeXml } from "../svg";

const ROW_H = 22;

// Octicon (16x16) icon markup, matching lowlighter/metrics' classic icons.
const ICONS: Record<string, string> = {
  commit: `<path fill-rule="evenodd" d="M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z"/>`,
  review: `<path fill-rule="evenodd" d="M2.5 1.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v7.736a.75.75 0 101.5 0V1.75A1.75 1.75 0 0011.25 0h-8.5A1.75 1.75 0 001 1.75v11.5c0 .966.784 1.75 1.75 1.75h3.17a.75.75 0 000-1.5H2.75a.25.25 0 01-.25-.25V1.75zM4.75 4a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5zM4 7.75A.75.75 0 014.75 7h2a.75.75 0 010 1.5h-2A.75.75 0 014 7.75zm11.774 3.537a.75.75 0 00-1.048-1.074L10.7 14.145 9.281 12.72a.75.75 0 00-1.062 1.058l1.943 1.95a.75.75 0 001.055.008l4.557-4.45z"/>`,
  pr: `<path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>`,
  issue: `<path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path fill-rule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/>`,
  comment: `<path fill-rule="evenodd" d="M2.75 2.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75zM1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"/>`,
};

export interface Metric {
  icon: string;
  label: string;
  count: number;
}

const DEFAULT_ROWS = "commits,reviews,prs,issues,comments";

/** Fetches the configured, ordered set of all-time contribution counts. */
export async function fetchActivity(ctx: PluginContext): Promise<Metric[]> {
  // All counts are all-time. GraphQL gives lifetime totals for PRs / issues /
  // comments directly; commits and reviews have no lifetime GraphQL field, so
  // use search (with the last-year contributionsCollection as a fallback).
  const data = await ctx.graphql(
    `query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          totalCommitContributions
          totalPullRequestReviewContributions
        }
        pullRequests { totalCount }
        issues { totalCount }
        issueComments { totalCount }
      }
    }`,
    { login: ctx.user },
  );

  const user = data.user;
  const c = user.contributionsCollection;
  const enc = encodeURIComponent(ctx.user);

  const searchCount = async (query: string, fallback: number): Promise<number> => {
    try {
      const res = await ctx.rest(`/search/${query}&per_page=1`);
      return typeof res.total_count === "number" ? res.total_count : fallback;
    } catch (error) {
      console.warn(`activity: search "${query}" failed, using fallback`, error);
      return fallback;
    }
  };

  const commitCount = await searchCount(`commits?q=author:${enc}`, c.totalCommitContributions);
  const reviewCount = await searchCount(
    `issues?q=reviewed-by:${enc}+type:pr`,
    c.totalPullRequestReviewContributions,
  );

  const metrics: Record<string, Metric> = {
    commits: { icon: "commit", label: "Commits", count: commitCount },
    reviews: { icon: "review", label: "Pull requests reviewed", count: reviewCount },
    prs: { icon: "pr", label: "Pull requests opened", count: user.pullRequests.totalCount },
    issues: { icon: "issue", label: "Issues opened", count: user.issues.totalCount },
    comments: { icon: "comment", label: "issue comments", count: user.issueComments.totalCount },
  };

  // Which rows to show, and in what order — configurable via METRICS_ACTIVITY.
  return (process.env.METRICS_ACTIVITY ?? DEFAULT_ROWS)
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => metrics[key])
    .filter((metric): metric is Metric => Boolean(metric));
}

/** Aggregate contribution counts (metrics-style Activity summary). */
export const activityPlugin: Plugin = {
  name: "activity",
  async run(ctx) {
    const rows = await fetchActivity(ctx);

    const body = rows
      .map((metric, i) => {
        const ly = 14 + i * ROW_H;
        const icon = ICONS[metric.icon] ?? ICONS.commit;
        return `
        <g class="icon" transform="translate(0, ${ly - 12})">${icon}</g>
        <text x="24" y="${ly}" class="value">${metric.count} ${escapeXml(metric.label)}</text>`;
      })
      .join("");

    return {
      title: "Activity",
      // Reserve up to the last row's baseline (no extra trailing row height),
      // so the gap below matches the other sections.
      height: rows.length ? 14 + (rows.length - 1) * ROW_H : 20,
      body: body || `<text x="0" y="14" class="muted">No activity</text>`,
    };
  },
};
