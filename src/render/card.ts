import type { Section } from "../types";

export const WIDTH = 530;
const PAD = 24;
const GAP = 18;
const TITLE_H = 24;
const COL_GAP = 0; // extra gap between columns (each column already has PAD)

/** Content width available to a section body (inside horizontal padding). */
export const CONTENT_WIDTH = WIDTH - PAD * 2;

/** Stacks one column's sections vertically; returns its markup + height. */
function layoutColumn(sections: Section[]): { parts: string[]; height: number } {
  let y = PAD;
  const parts: string[] = [];

  for (const section of sections) {
    if (section.title) {
      parts.push(
        `<g transform="translate(${PAD}, ${y})"><text class="title" x="0" y="12">${section.title}</text></g>`,
      );
      y += TITLE_H;
    }
    parts.push(`<g transform="translate(${PAD}, ${y})">${section.body}</g>`);
    y += section.height + GAP;
  }

  return { parts, height: Math.round(y - GAP + PAD) };
}

/**
 * Renders one or more columns of sections side by side into a single SVG card.
 * A single column behaves like a normal (unsplit) card.
 */
export function renderCard(columns: Section[][]): string {
  const laid = columns.map(layoutColumn);
  const height = Math.max(PAD * 2, ...laid.map((l) => l.height));
  const width = columns.length * WIDTH + (columns.length - 1) * COL_GAP;

  const groups = laid
    .map((l, i) => `<g transform="translate(${i * (WIDTH + COL_GAP)}, 0)">${l.parts.join("\n")}</g>`)
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
  <style>
    /* Transparent background, no border. metrics-style neutral palette:
       a mid-gray that stays legible on both light and dark backgrounds
       without detecting the viewer's theme. */
    text { fill: #777; }
    .name { fill: #0366d6; }
    .title { fill: #0366d6; font-size: 15px; font-weight: 600; }
    .muted { fill: #959da5; font-size: 12px; }
    .value { font-size: 13px; }
    .icon { fill: #777; }
    .error { fill: #cb2431; font-size: 13px; }
  </style>
${groups}
</svg>`;
}
