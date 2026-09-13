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
    /* Transparent background; colors adapt to the viewer's GitHub theme. */
    .bg { fill: none; stroke: #d0d7de; }
    text { fill: #1f2328; }
    .title { fill: #0969da; font-size: 15px; font-weight: 600; }
    .muted { fill: #59636e; font-size: 12px; }
    .value { font-size: 13px; }
    .error { fill: #cf222e; font-size: 13px; }
    @media (prefers-color-scheme: dark) {
      .bg { stroke: #30363d; }
      text { fill: #e6edf3; }
      .title { fill: #2f81f7; }
      .muted { fill: #8b949e; }
      .error { fill: #f85149; }
    }
  </style>
  <rect class="bg" x="0.5" y="0.5" rx="6" width="${WIDTH - 1}" height="${height - 1}" />
${parts.join("\n")}
</svg>`;
}
