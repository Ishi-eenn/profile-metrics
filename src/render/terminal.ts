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
const PANE_GAP = 28; // horizontal gap between split panes

// Dracula-ish terminal palette.
const C = {
  bg: "#282a36",
  fg: "#f8f8f2",
  green: "#50fa7b",
  cyan: "#8be9fd",
  orange: "#ffb86c",
  dim: "#6272a4",
  divider: "#44475a",
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
 * Renders the given panes side by side as a split ray.so-style terminal window.
 * Each pane is a vertical stack of lines; a trailing prompt/cursor is appended
 * per pane, and a divider is drawn between panes. A single pane behaves like a
 * normal (unsplit) terminal.
 */
export function renderTerminal(opts: { user: string; panes: Line[][] }): string {
  const { user } = opts;
  const cursor = `${prompt("")}<tspan class="cur">▊</tspan>`;
  const panes = opts.panes.map((pane) => [...pane, "", cursor]);

  const paneChars = panes.map((pane) => pane.reduce((max, l) => Math.max(max, visibleLength(l)), 1));
  const maxLines = panes.reduce((max, pane) => Math.max(max, pane.length), 1);

  // Horizontal offset of each pane's left edge.
  const paneX: number[] = [];
  let x = PADX;
  panes.forEach((_, i) => {
    paneX.push(x);
    x += paneChars[i] * CW + (i < panes.length - 1 ? PANE_GAP : 0);
  });

  const winW = Math.max(MIN_W, x + PADX);
  const winH = TITLE + PAD_TOP + maxLines * LINE + PAD_BOTTOM;
  const svgW = Math.round(winW + MARGIN * 2);
  const svgH = Math.round(winH + MARGIN * 2);

  const body = panes
    .map((pane, pi) =>
      pane
        .map((line, li) => {
          const y = TITLE + PAD_TOP + li * LINE + 4;
          if (typeof line === "string") return `<text x="${paneX[pi]}" y="${y}">${line || " "}</text>`;
          return line.raw(paneX[pi], y);
        })
        .join("\n"),
    )
    .join("\n");

  const dividers = panes
    .slice(0, -1)
    .map((_, i) => {
      const dx = (paneX[i] + paneChars[i] * CW + paneX[i + 1]) / 2;
      return `<line x1="${dx.toFixed(1)}" y1="${TITLE}" x2="${dx.toFixed(1)}" y2="${winH}" stroke="${C.divider}" stroke-width="1" />`;
    })
    .join("");

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
    ${dividers}
    <g xml:space="preserve">
${body}
    </g>
  </g>
</svg>`;
}
