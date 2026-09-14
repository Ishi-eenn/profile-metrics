import { escapeXml } from "../../svg";
import { prompt } from "../../render/terminal";
import type { Profile } from "./fetch";

/** Terminal block: `cat profile` with the summary lines + last-week grass. */
export const profileLines = (p: Profile): string[] => [
  prompt("cat profile"),
  `  ${escapeXml(p.name)}`,
  `  Joined GitHub ${escapeXml(p.joined)}`,
  `  Followed by ${p.followers} users`,
  `  Contributed to ${p.contributedRepos} repositories`,
  `  ${p.week.map((d) => `<tspan fill="${d.color}">■</tspan>`).join(" ")}`,
];
