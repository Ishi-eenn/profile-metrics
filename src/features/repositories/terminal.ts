import { escapeXml } from "../../svg";
import { prompt } from "../../render/terminal";
import { humanNum, type RepoStats } from "./fetch";

const COL = 28; // left column width (chars)

/** Terminal block: `cat repositories` with two aligned columns of stats. */
export const repositoryLines = (s: RepoStats): string[] => {
  const left = [
    s.license,
    `${s.releases} Releases`,
    `${s.packages} Packages`,
    `${s.disk} used`,
    `${humanNum(s.linesAdded)} added, ${humanNum(s.linesRemoved)} removed`,
  ];
  const right = [
    `${s.sponsors} Sponsors`,
    `${s.stargazers} Stargazers`,
    `${s.forkers} Forkers`,
    `${s.watchers} Watchers`,
  ];

  const rows = left.map((l, i) => `  ${escapeXml(l.padEnd(COL))}${escapeXml(right[i] ?? "")}`);

  return [prompt("cat repositories"), `  ${s.repositories} Repositories`, ...rows];
};
