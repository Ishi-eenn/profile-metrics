import type { PluginContext } from "../../types";

export interface Day {
  color: string;
  count: number;
}

export interface Profile {
  name: string;
  login: string;
  avatarUrl: string;
  joined: string; // e.g. "4 years ago"
  followers: number;
  contributedRepos: number;
  week: Day[]; // last 7 contribution days
}

/** Human "X ago" for the account age. */
function joinedAgo(createdAt: string): string {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  const years = Math.floor(days / 365);
  if (years >= 1) return `${years} year${years > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months >= 1) return `${months} month${months > 1 ? "s" : ""} ago`;
  const d = Math.max(1, Math.floor(days));
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

/** Fetches profile summary + the last week's contribution days. */
export async function fetchProfile(ctx: PluginContext): Promise<Profile> {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86_400_000);

  const data = await ctx.graphql(
    `query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        name
        login
        avatarUrl
        createdAt
        followers { totalCount }
        repositoriesContributedTo(
          includeUserRepositories: true
          contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, REPOSITORY, PULL_REQUEST_REVIEW]
        ) { totalCount }
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks { contributionDays { contributionCount color } }
          }
        }
      }
    }`,
    { login: ctx.user, from: from.toISOString(), to: to.toISOString() },
  );

  const u = data.user;
  const days: any[] = u.contributionsCollection.contributionCalendar.weeks.flatMap(
    (w: any) => w.contributionDays,
  );
  const week: Day[] = days
    .slice(-7)
    .map((d) => ({ color: d.color, count: d.contributionCount }));

  return {
    name: u.name ?? u.login,
    login: u.login,
    avatarUrl: u.avatarUrl,
    joined: joinedAgo(u.createdAt),
    followers: u.followers.totalCount,
    contributedRepos: u.repositoriesContributedTo.totalCount,
    week,
  };
}
