import type { PluginContext } from "../../types";

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
