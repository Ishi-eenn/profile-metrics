import type { Plugin } from "../../types";
import { escapeXml, fetchDataUri } from "../../svg";
import { CONTENT_WIDTH } from "../../render/card";
import { CLOCK, PEOPLE, CONTRIB } from "./icons";
import { fetchProfile } from "./fetch";

const SQ = 9; // grass square size
const GAP = 2; // grass gap
const PITCH = SQ + GAP;

/** Avatar + name + joined / followers / contributed, with a last-week grass. */
export const headerPlugin: Plugin = {
  name: "header",
  async run(ctx) {
    const p = await fetchProfile(ctx);
    const sep = p.avatarUrl.includes("?") ? "&" : "?";
    const avatar = await fetchDataUri(`${p.avatarUrl}${sep}size=96`);

    // A left-column icon + text row.
    const row = (icon: string, iconX: number, textX: number, y: number, text: string) =>
      `<g class="icon" transform="translate(${iconX}, ${y - 12})">${icon}</g>` +
      `<text x="${textX}" y="${y}" class="value">${escapeXml(text)}</text>`;

    // Right column: grass on top, "Contributed to" below it.
    const grassW = p.week.length * PITCH - GAP;
    const gx = CONTENT_WIDTH - grassW;
    const grass = p.week
      .map((d, i) => `<rect x="${gx + i * PITCH}" y="30" width="${SQ}" height="${SQ}" rx="2" fill="${d.color}" />`)
      .join("");

    return {
      height: 66,
      body: `
        <defs><clipPath id="avatar-clip"><circle cx="28" cy="28" r="28"/></clipPath></defs>
        <image href="${avatar}" x="0" y="0" width="56" height="56" clip-path="url(#avatar-clip)" />
        <text x="72" y="18" class="name" font-size="17" font-weight="600">${escapeXml(p.name)}</text>
        ${row(CLOCK, 72, 94, 40, `Joined GitHub ${p.joined}`)}
        ${row(PEOPLE, 72, 94, 60, `Followed by ${p.followers} users`)}
        ${grass}
        ${row(CONTRIB, 240, 262, 60, `Contributed to ${p.contributedRepos} repositories`)}`,
    };
  },
};
