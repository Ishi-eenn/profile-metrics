import type { Plugin } from "../types";
import { escapeXml } from "../svg";
import { CONTENT_WIDTH } from "../render";

const MAX_EVENTS = 5;
const ROW_H = 22;

// Octicon (16x16) path data, keyed by a logical icon name.
const ICONS: Record<string, string> = {
  commit:
    "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
  pr:
    "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z",
  issue:
    "M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z",
  star:
    "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
  repo:
    "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z",
  fork:
    "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z",
  tag:
    "M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.75 1.75 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z",
  activity:
    "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm9-3a1 1 0 1 0-2 0v3.25a.75.75 0 0 0 .22.53l2.25 2.25a1 1 0 1 0 1.42-1.42L9 7.836Z",
};

interface Activity {
  icon: string;
  text: string;
  time: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "now";
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Maps a raw GitHub event to an icon + one-line description. */
function describe(event: any): Activity | null {
  const repo: string = event.repo?.name ?? "";
  const p = event.payload ?? {};
  const base = { time: relativeTime(event.created_at) };
  switch (event.type) {
    case "PushEvent": {
      const n = p.size ?? p.distinct_size ?? p.commits?.length ?? 0;
      const what = n ? `${n} commit${n === 1 ? "" : "s"}` : "changes";
      return { ...base, icon: "commit", text: `Pushed ${what} to ${repo}` };
    }
    case "PullRequestEvent":
      return { ...base, icon: "pr", text: `${p.action} pull request #${p.number} in ${repo}` };
    case "IssuesEvent":
      return { ...base, icon: "issue", text: `${p.action} issue #${p.issue?.number} in ${repo}` };
    case "WatchEvent":
      return { ...base, icon: "star", text: `Starred ${repo}` };
    case "CreateEvent":
      return { ...base, icon: "repo", text: `Created ${p.ref_type}${p.ref ? ` ${p.ref}` : ""} in ${repo}` };
    case "ForkEvent":
      return { ...base, icon: "fork", text: `Forked ${repo}` };
    case "ReleaseEvent":
      return { ...base, icon: "tag", text: `Released ${p.release?.tag_name ?? ""} in ${repo}` };
    case "IssueCommentEvent":
      return { ...base, icon: "issue", text: `Commented on #${p.issue?.number} in ${repo}` };
    default:
      return null;
  }
}

/** Recent public activity feed, metrics-style. */
export const activityPlugin: Plugin = {
  name: "activity",
  async run(ctx) {
    const events: any[] = await ctx.rest(`/users/${ctx.user}/events/public?per_page=100`);
    const activities = events
      .map(describe)
      .filter((a): a is Activity => a !== null)
      .slice(0, MAX_EVENTS);

    const rows = activities.map((a, i) => {
      const ly = 14 + i * ROW_H;
      const icon = ICONS[a.icon] ?? ICONS.activity;
      return `
        <g class="icon" transform="translate(0, ${ly - 12})"><path d="${icon}" /></g>
        <text x="24" y="${ly}" class="value">${escapeXml(truncate(a.text, 46))}</text>
        <text x="${CONTENT_WIDTH}" y="${ly}" text-anchor="end" class="muted">${a.time}</text>`;
    });

    return {
      title: "Activity",
      height: Math.max(activities.length, 1) * ROW_H,
      body: rows.join("") || `<text x="0" y="14" class="muted">No recent public activity</text>`,
    };
  },
};
