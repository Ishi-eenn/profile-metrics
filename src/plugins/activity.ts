import type { Plugin } from "../types";
import { escapeXml } from "../svg";

const ROW_H = 22;

// Octicon (16x16) path data, keyed by logical icon name.
const ICONS: Record<string, string> = {
  commit:
    "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
  review:
    "M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.831.88 9.577.43 8.9a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.023C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z",
  pr:
    "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z",
  issue:
    "M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z",
  comment:
    "M1.5 2.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25h-6.5a.75.75 0 0 0-.53.22L4.5 14.44v-1.19a.75.75 0 0 0-.75-.75h-2a.25.25 0 0 1-.25-.25Zm.25-1.75A1.75 1.75 0 0 0 0 2.75v8.5C0 12.216.784 13 1.75 13H3v1.543a1.457 1.457 0 0 0 2.487 1.03L8.061 13h6.189A1.75 1.75 0 0 0 16 11.25v-8.5A1.75 1.75 0 0 0 14.25 1Z",
};

interface Metric {
  icon: string;
  label: string;
  count: number;
}

const DEFAULT_ROWS = "commits,reviews,prs,issues,comments";

/** Aggregate contribution counts (metrics-style Activity summary). */
export const activityPlugin: Plugin = {
  name: "activity",
  async run(ctx) {
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
    const rows = (process.env.METRICS_ACTIVITY ?? DEFAULT_ROWS)
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean)
      .map((key) => metrics[key])
      .filter((metric): metric is Metric => Boolean(metric));

    const body = rows
      .map((metric, i) => {
        const ly = 14 + i * ROW_H;
        const icon = ICONS[metric.icon] ?? ICONS.commit;
        return `
        <g class="icon" transform="translate(0, ${ly - 12})"><path d="${icon}" /></g>
        <text x="24" y="${ly}" class="value">${metric.count} ${escapeXml(metric.label)}</text>`;
      })
      .join("");

    return {
      title: "Activity",
      height: Math.max(rows.length, 1) * ROW_H,
      body: body || `<text x="0" y="14" class="muted">No activity</text>`,
    };
  },
};
