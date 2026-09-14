import { escapeXml } from "../../svg";
import { prompt } from "../../render/terminal";
import type { LanguageStat } from "./fetch";

const BAR = 16; // language bar length (chars)
const NAME_W = 12; // language name column width (chars)

/** Terminal block: `cat languages` followed by a bar chart per language. */
export const languageLines = (languages: LanguageStat[]): string[] => [
  prompt("cat languages"),
  ...languages.map((lang) => {
    const name =
      lang.name.length > NAME_W ? `${lang.name.slice(0, NAME_W - 1)}…` : lang.name.padEnd(NAME_W);
    const filled = Math.min(BAR, Math.max(1, Math.round((lang.pct / 100) * BAR)));
    const bar =
      `<tspan fill="${lang.color}">${"█".repeat(filled)}</tspan>` +
      `<tspan class="d">${"░".repeat(BAR - filled)}</tspan>`;
    const pct = `${lang.pct.toFixed(1)}%`.padStart(6);
    return `  ${escapeXml(name)} ${bar} <tspan class="n">${pct}</tspan>`;
  }),
];
