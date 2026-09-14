import { escapeXml } from "../../svg";
import { prompt } from "../../render/terminal";
import type { Metric } from "./fetch";

/** Terminal block: `cat activity` followed by count rows. */
export const activityLines = (activity: Metric[]): string[] => [
  prompt("cat activity"),
  ...activity.map(
    (m) => `  <tspan class="n">${String(m.count).padStart(6)}</tspan>  ${escapeXml(m.label)}`,
  ),
];
