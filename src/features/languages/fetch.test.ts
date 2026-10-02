import assert from "node:assert/strict";
import test from "node:test";
import { yearsSince } from "./fetch";

test("yearsSince covers creation year through now, inclusive", () => {
  const now = new Date("2026-06-15T00:00:00Z");
  assert.deepEqual(yearsSince("2022-03-01T00:00:00Z", now), [2022, 2023, 2024, 2025, 2026]);
  assert.deepEqual(yearsSince("2026-01-01T00:00:00Z", now), [2026]);
});
