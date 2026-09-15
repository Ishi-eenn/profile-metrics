import type { Plugin } from "../../types";
import { escapeXml } from "../../svg";
import {
  REPO, LICENSE, RELEASES, PACKAGES, DISK, LINES,
  SPONSORS, STARGAZERS, FORKERS, WATCHERS,
} from "./icons";
import { fetchRepositories, humanNum } from "./fetch";

const RX = 250; // right column x
const ROW_H = 20;

/** Lifetime repository stats (metrics-style Repositories section). */
export const repositoriesPlugin: Plugin = {
  name: "repositories",
  async run(ctx) {
    const s = await fetchRepositories(ctx);

    const row = (icon: string, x: number, y: number, text: string) =>
      `<g class="icon" transform="translate(${x}, ${y - 12})">${icon}</g>` +
      `<text x="${x + 22}" y="${y}" class="value">${escapeXml(text)}</text>`;

    const left = [
      row(LICENSE, 0, 40, s.license),
      row(RELEASES, 0, 40 + ROW_H, `${s.releases} Releases`),
      row(PACKAGES, 0, 40 + ROW_H * 2, `${s.packages} Packages`),
      row(DISK, 0, 40 + ROW_H * 3, `${s.disk} used`),
      row(LINES, 0, 40 + ROW_H * 4, `${humanNum(s.linesAdded)} added, ${humanNum(s.linesRemoved)} removed`),
    ];
    const right = [
      row(SPONSORS, RX, 40, `${s.sponsors} Sponsors`),
      row(STARGAZERS, RX, 40 + ROW_H, `${s.stargazers} Stargazers`),
      row(FORKERS, RX, 40 + ROW_H * 2, `${s.forkers} Forkers`),
      row(WATCHERS, RX, 40 + ROW_H * 3, `${s.watchers} Watchers`),
    ];

    return {
      height: 40 + ROW_H * 4 + 4,
      body: `
        <g transform="translate(0, 2)" fill="#0366d6">${REPO}</g>
        <text x="22" y="14" class="title">${s.repositories} Repositories</text>
        ${left.join("")}
        ${right.join("")}`,
    };
  },
};
