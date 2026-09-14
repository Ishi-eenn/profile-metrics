import { escapeXml } from "../svg";

const MONO =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace";
const FS = 13.5; // font size
export const CW = 8.13; // approx monospace char width at FS
const LINE = 21; // line height
const MARGIN = 34; // transparent padding around the window
const PADX = 18; // window inner horizontal padding
const TITLE = 36; // title bar height
const PAD_TOP = 12;
const PAD_BOTTOM = 16;
const MIN_W = 380; // minimum window width

// Dracula-ish terminal palette.
const C = {
  bg: "#282a36",
  fg: "#f8f8f2",
  green: "#50fa7b",
  cyan: "#8be9fd",
  orange: "#ffb86c",
  dim: "#6272a4",
};

/** A shell prompt line: `➜  ~  <cmd>`. Shared by feature terminal blocks. */
export const prompt = (cmd: string) =>
  `<tspan class="p">➜</tspan>  <tspan class="c">~</tspan>  ${escapeXml(cmd)}`;

/**
 * A terminal line: either text (rendered in a monospace <text>) or a raw SVG
 * line whose markup is produced from the line's origin (x) and baseline (y) —
 * used for crisp, uniform shapes like the contribution grass.
 */
export type Line = string | { raw: (x: number, y: number) => string };

/** Visible character count of a text line (ignoring markup), for sizing. */
const visibleLength = (line: Line) =>
  typeof line === "string" ? line.replace(/<[^>]+>/g, "").length : 0;

/**
 * Renders content blocks (each an array of ready-made lines) as a ray.so-style
 * terminal window. Blocks are separated by a blank line; a cursor prompt is
 * appended. The window is feature-agnostic — features build their own lines.
 */
export function renderTerminal(opts: { user: string; blocks: Line[][] }): string {
  const { user, blocks } = opts;

  const lines: Line[] = [];
  blocks.forEach((block, i) => {
    if (i > 0) lines.push("");
    lines.push(...block);
  });
  lines.push("");
  lines.push(`${prompt("")}<tspan class="cur">▊</tspan>`);

  const maxChars = lines.reduce((max, line) => Math.max(max, visibleLength(line)), 0);
  const winW = Math.max(MIN_W, PADX * 2 + maxChars * CW);
  const winH = TITLE + PAD_TOP + lines.length * LINE + PAD_BOTTOM;
  const svgW = Math.round(winW + MARGIN * 2);
  const svgH = Math.round(winH + MARGIN * 2);

  const body = lines
    .map((line, i) => {
      const y = TITLE + PAD_TOP + i * LINE + 4;
      if (typeof line === "string") return `<text x="${PADX}" y="${y}">${line || " "}</text>`;
      return line.raw(PADX, y);
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
