import { test } from "node:test";
import assert from "node:assert/strict";
import { getMilestoneTier } from "@/lib/hours/milestones";

test("Milestone tier reflects YTD hours", () => {
  assert.equal(
    getMilestoneTier({ ytdHours: 5, bronzeHours: 10, silverHours: 25, goldHours: 50 }),
    "NONE"
  );
  assert.equal(
    getMilestoneTier({ ytdHours: 12, bronzeHours: 10, silverHours: 25, goldHours: 50 }),
    "BRONZE"
  );
  assert.equal(
    getMilestoneTier({ ytdHours: 30, bronzeHours: 10, silverHours: 25, goldHours: 50 }),
    "SILVER"
  );
  assert.equal(
    getMilestoneTier({ ytdHours: 80, bronzeHours: 10, silverHours: 25, goldHours: 50 }),
    "GOLD"
  );
});
