import assert from "node:assert/strict";
import test from "node:test";

test("parseParishDateTime respects parish timezone offsets", async () => {
  process.env.PARISH_TIMEZONE = "America/New_York";
  const { parseParishDateTime } = await import("../../lib/time/parish");

  const result = parseParishDateTime("2024-02-01", "16:00");

  assert.equal(result.toISOString(), "2024-02-01T21:00:00.000Z");
});
