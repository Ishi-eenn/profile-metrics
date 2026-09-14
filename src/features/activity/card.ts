import type { Plugin } from "../../types";
import { escapeXml } from "../../svg";
import { ICONS } from "./icons";
import { fetchActivity } from "./fetch";

const ROW_H = 22;

/** Aggregate contribution counts (metrics-style Activity summary). */
export const activityPlugin: Plugin = {
  name: "activity",
  async run(ctx) {
    const rows = await fetchActivity(ctx);

    const body = rows
      .map((metric, i) => {
        const ly = 14 + i * ROW_H;
        const icon = ICONS[metric.icon] ?? ICONS.commit;
        return `
        <g class="icon" transform="translate(0, ${ly - 12})">${icon}</g>
        <text x="24" y="${ly}" class="value">${metric.count} ${escapeXml(metric.label)}</text>`;
      })
      .join("");

    return {
      title: "Activity",
      // Reserve up to the last row's baseline (no extra trailing row height),
      // so the gap below matches the other sections.
      height: rows.length ? 14 + (rows.length - 1) * ROW_H : 20,
      body: body || `<text x="0" y="14" class="muted">No activity</text>`,
    };
  },
};
