import type { Plugin } from "../../types";
import { escapeXml } from "../../svg";
import { CONTENT_WIDTH } from "../../render/card";
import { fetchLanguages } from "./fetch";

/** Stacked language bar + legend, aggregated across owned repositories. */
export const languagesPlugin: Plugin = {
  name: "languages",
  async run(ctx) {
    const langs = await fetchLanguages(ctx);

    let x = 0;
    const bar: string[] = [];
    for (const lang of langs) {
      const w = (lang.pct / 100) * CONTENT_WIDTH;
      bar.push(`<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="8" fill="${lang.color}" />`);
      x += w;
    }

    const legend = langs.map((lang, i) => {
      const lx = (i % 2) * (CONTENT_WIDTH / 2);
      const ly = 28 + Math.floor(i / 2) * 20;
      return `
        <circle cx="${lx + 6}" cy="${ly - 4}" r="6" fill="${lang.color}" />
        <text x="${lx + 18}" y="${ly}" class="value">${escapeXml(lang.name)} <tspan class="muted">${lang.pct.toFixed(1)}%</tspan></text>`;
    });

    const rows = Math.ceil(langs.length / 2);
    return {
      title: "Most used languages",
      height: 16 + rows * 20,
      body: `
        <clipPath id="bar-clip"><rect x="0" y="0" width="${CONTENT_WIDTH}" height="8" rx="4" /></clipPath>
        <g clip-path="url(#bar-clip)">
          <rect x="0" y="0" width="${CONTENT_WIDTH}" height="8" fill="#eaecef" />
          ${bar.join("")}
        </g>
        ${legend.join("")}`,
    };
  },
};
