import assert from "node:assert/strict";
import test from "node:test";
import { pages } from "./github";

test("pages walks every page and stops at the last", async () => {
  const responses = [
    { user: { repos: { pageInfo: { hasNextPage: true, endCursor: "c1" }, nodes: [1, 2] } } },
    { user: { repos: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [3] } } },
  ];
  const cursors: unknown[] = [];
  const graphql = async (_q: string, vars: any = {}): Promise<any> => {
    cursors.push(vars.endCursor);
    return responses[cursors.length - 1];
  };

  const nodes: number[] = [];
  for await (const data of pages(graphql, "", { login: "x" }, (d) => d.user.repos)) {
    nodes.push(...data.user.repos.nodes);
  }

  assert.deepEqual(nodes, [1, 2, 3]);
  assert.deepEqual(cursors, [null, "c1"]);
});
