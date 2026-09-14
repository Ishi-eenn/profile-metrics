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

    const row = (icon: string, y: number, text: string) =>
      `<g class="icon" transform="translate(72, ${y - 12})">${icon}</g>` +
      `<text x="94" y="${y}" class="value">${escapeXml(text)}</text>`;

    // Last-week contribution grass, right-aligned near the top.
    const gx = CONTENT_WIDTH - (p.week.length * PITCH - GAP);
    const grass = p.week
      .map((d, i) => `<rect x="${gx + i * PITCH}" y="30" width="${SQ}" height="${SQ}" rx="2" fill="${d.color}" />`)
      .join("");

    return {
      height: 82,
      body: `
        <defs><clipPath id="avatar-clip"><circle cx="28" cy="28" r="28"/></clipPath></defs>
        <image href="${avatar}" x="0" y="0" width="56" height="56" clip-path="url(#avatar-clip)" />
        <text x="72" y="18" class="name" font-size="17" font-weight="600">${escapeXml(p.name)}</text>
        ${row(CLOCK, 40, `Joined GitHub ${p.joined}`)}
        ${row(PEOPLE, 60, `Followed by ${p.followers} users`)}
        ${row(CONTRIB, 80, `Contributed to ${p.contributedRepos} repositories`)}
        ${grass}`,
    };
  },
};
