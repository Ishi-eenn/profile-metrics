import type { Section } from "./types";

export const WIDTH = 480;
const PAD = 24;
const GAP = 18;
const TITLE_H = 24;

/** Content width available to a section body (inside horizontal padding). */
export const CONTENT_WIDTH = WIDTH - PAD * 2;

/** Stacks sections vertically into a single self-contained SVG card. */
export function renderCard(sections: Section[]): string {
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

  const height = Math.round(y - GAP + PAD);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
  <style>
    .bg { fill: #ffffff; stroke: #e1e4e8; }
    text { fill: #24292f; }
    .title { fill: #0366d6; font-size: 15px; font-weight: 600; }
    .muted { fill: #586069; font-size: 12px; }
    .value { font-size: 13px; }
    .error { fill: #cb2431; font-size: 13px; }
  </style>
  <rect class="bg" x="0.5" y="0.5" rx="6" width="${WIDTH - 1}" height="${height - 1}" />
${parts.join("\n")}
</svg>`;
}
