import { escapeXml } from "../../svg";
import { prompt, CW, type Line } from "../../render/terminal";
import type { Profile } from "./fetch";

const SQ = 11; // grass square size
const GAP = 3;
const INDENT = 2; // align with the "  " text indent

/** Terminal block: `cat profile` with the summary lines + last-week grass. */
export const profileLines = (p: Profile): Line[] => [
  prompt("cat profile"),
  `  ${escapeXml(p.name)}`,
  `  Joined GitHub ${escapeXml(p.joined)}`,
  `  Followed by ${p.followers} users`,
  `  Contributed to ${p.contributedRepos} repositories`,
  {
    // Draw the grass as uniform rects (crisp + identical size at any color).
    raw: (x, y) =>
      p.week
        .map(
          (d, i) =>
            `<rect x="${(x + INDENT * CW + i * (SQ + GAP)).toFixed(1)}" y="${y - SQ}" width="${SQ}" height="${SQ}" rx="2" fill="${d.color}" />`,
        )
        .join(""),
  },
];
