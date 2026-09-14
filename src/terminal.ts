import { escapeXml } from "./svg";
import type { LanguageStat } from "./plugins/languages";
import type { Metric } from "./plugins/activity";

const MONO =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace";
const FS = 13.5; // font size
const CW = 8.13; // approx monospace char width at FS
const LINE = 21; // line height
const MARGIN = 34; // gradient padding around the window
const PADX = 18; // window inner horizontal padding
const TITLE = 36; // title bar height
const PAD_TOP = 12;
const PAD_BOTTOM = 16;
const BAR = 16; // language bar length (chars)
const NAME_W = 12; // language name column width (chars)

// Dracula-ish terminal palette.
const C = {
  bg: "#282a36",
  fg: "#f8f8f2",
  green: "#50fa7b",
  cyan: "#8be9fd",
  orange: "#ffb86c",
  dim: "#6272a4",
};

const prompt = (cmd: string) =>
  `<tspan class="p">➜</tspan>  <tspan class="c">~</tspan>  ${escapeXml(cmd)}`;

export type TerminalBlock =
  | { kind: "activity"; data: Metric[] }
  | { kind: "languages"; data: LanguageStat[] };

const activityLines = (activity: Metric[]): string[] => [
  prompt("gh activity"),
  ...activity.map((m) => `  <tspan class="n">${String(m.count).padStart(6)}</tspan>  ${escapeXml(m.label)}`),
];

const languageLines = (languages: LanguageStat[]): string[] => [
  prompt("gh languages"),
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

/** Renders the given blocks (in order) as a ray.so-style terminal window. */
export function renderTerminal(opts: { user: string; blocks: TerminalBlock[] }): string {
  const { user, blocks } = opts;
  const lines: string[] = [];

  blocks.forEach((block, i) => {
    if (i > 0) lines.push("");
    lines.push(...(block.kind === "activity" ? activityLines(block.data) : languageLines(block.data)));
  });
  lines.push("");
  lines.push(`${prompt("")}<tspan class="cur">▊</tspan>`);

  const maxChars = 6 + NAME_W + BAR + 8;
  const winW = Math.max(380, PADX * 2 + maxChars * CW);
  const winH = TITLE + PAD_TOP + lines.length * LINE + PAD_BOTTOM;
  const svgW = Math.round(winW + MARGIN * 2);
  const svgH = Math.round(winH + MARGIN * 2);

  const body = lines
    .map((html, i) => {
      const y = TITLE + PAD_TOP + i * LINE + 4;
      return `<text x="${PADX}" y="${y}">${html || " "}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" font-family="${MONO}">
  <style>
    text { fill: ${C.fg}; font-size: ${FS}px; white-space: pre; }
    .p { fill: ${C.green}; }
    .c { fill: ${C.cyan}; }
    .n { fill: ${C.orange}; }
    .d { fill: ${C.dim}; }
    .cur { fill: ${C.fg}; }
    .title { fill: ${C.dim}; font-size: 12px; }
  </style>
  <g transform="translate(${MARGIN}, ${MARGIN})">
    <rect x="3" y="6" width="${winW}" height="${winH}" rx="10" fill="#000000" opacity="0.22" />
    <rect width="${winW}" height="${winH}" rx="10" fill="${C.bg}" />
    <circle cx="20" cy="${TITLE / 2}" r="6" fill="#ff5f56" />
    <circle cx="40" cy="${TITLE / 2}" r="6" fill="#ffbd2e" />
    <circle cx="60" cy="${TITLE / 2}" r="6" fill="#27c93f" />
    <text x="${winW / 2}" y="${TITLE / 2 + 4}" text-anchor="middle" class="title">${escapeXml(user)} — zsh</text>
    <g xml:space="preserve">
${body}
    </g>
  </g>
</svg>`;
}
