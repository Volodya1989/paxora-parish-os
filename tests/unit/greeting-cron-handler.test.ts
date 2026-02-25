import { test } from "node:test";
import assert from "node:assert/strict";
import { getParishLocalDateParts } from "@/lib/email/greetingSchedule";

// Use string literals instead of importing GreetingType from @prisma/client,
// which requires a generated Prisma client that may not exist in CI.
const BIRTHDAY = "BIRTHDAY" as const;

// greetingCandidates.ts and greetings.ts transitively import @prisma/client,
// so we use dynamic imports to avoid crashing the whole file when the
// generated client is missing (e.g. in CI before prisma generate).
async function importCandidates() {
  return import("@/lib/email/greetingCandidates");
}

async function importGreetings() {
  return import("@/lib/email/greetings");
}

// ---------------------------------------------------------------------------
// 1. Timezone localDateKey + birthday match
// ---------------------------------------------------------------------------

test("getParishLocalDateParts returns correct local date for America/New_York at cron time 14:00 UTC", () => {
  // 14:00 UTC = 09:00 EST (Feb 24)
  const nowUtc = new Date("2026-02-24T14:00:00.000Z");
  const result = getParishLocalDateParts(nowUtc, "America/New_York");

  assert.equal(result.month, 2);
  assert.equal(result.day, 24);
  assert.equal(result.dateKey, "2026-02-24");
  assert.equal(result.hour, 9);
  assert.equal(result.minute, 0);
  assert.equal(result.mode, "iana");
});

test("getParishLocalDateParts handles date boundary: UTC date ahead of local date", () => {
  // 2026-02-25T03:00:00Z = 2026-02-24 22:00 EST → still Feb 24 locally
  const nowUtc = new Date("2026-02-25T03:00:00.000Z");
  const result = getParishLocalDateParts(nowUtc, "America/New_York");

  assert.equal(result.month, 2);
  assert.equal(result.day, 24);
  assert.equal(result.dateKey, "2026-02-24");
});

test("getParishLocalDateParts handles date boundary: local date ahead of UTC", () => {
  // 2026-02-24T23:30:00Z = 2026-02-25 08:30 Asia/Tokyo (UTC+9)
  const nowUtc = new Date("2026-02-24T23:30:00.000Z");
  const result = getParishLocalDateParts(nowUtc, "Asia/Tokyo");

  assert.equal(result.month, 2);
  assert.equal(result.day, 25);
  assert.equal(result.dateKey, "2026-02-25");
});

test("getParishLocalDateParts midnight edge case with hourCycle h23", () => {
  // Test that midnight is 0, not 24
  const nowUtc = new Date("2026-02-25T05:00:00.000Z");
  const result = getParishLocalDateParts(nowUtc, "America/New_York");
  // 05:00 UTC = 00:00 EST
  assert.equal(result.hour, 0);
  assert.equal(result.day, 25);
});

test("getParishLocalDateParts legacy UTC offset for birthday match", () => {
  const nowUtc = new Date("2026-02-24T14:00:00.000Z");
  const result = getParishLocalDateParts(nowUtc, "UTC-5");

  assert.equal(result.month, 2);
  assert.equal(result.day, 24);
  assert.equal(result.hour, 9);
  assert.equal(result.dateKey, "2026-02-24");
  assert.equal(result.mode, "legacy-offset");
});

// ---------------------------------------------------------------------------
// 2. Idempotency: buildGreetingCandidateSnapshot only marks sendable when
//    not already sent
// ---------------------------------------------------------------------------

test("buildGreetingCandidateSnapshot marks already-sent birthday as not sendable", async () => {
  const { buildGreetingCandidateSnapshot } = await importCandidates();
  const { candidates, summary } = buildGreetingCandidateSnapshot({
    month: 2,
    day: 24,
    memberships: [
      {
        userId: "u1",
        user: {
          email: "u1@example.com",
          name: "User One",
          birthdayMonth: 2,
          birthdayDay: 24,
          anniversaryMonth: null,
          anniversaryDay: null
        }
      }
    ],
    sentLogs: [{ userId: "u1", type: BIRTHDAY }]
  });

  assert.equal(summary.sendableToday, 0);
  assert.equal(summary.alreadySentToday, 1);
  assert.equal(summary.dateMatchedMemberships, 1);
  assert.equal(candidates[0]?.alreadySentBirthday, true);
  assert.equal(candidates[0]?.sendBirthday, true);
});

test("buildGreetingCandidateSnapshot allows send when no prior log exists", async () => {
  const { buildGreetingCandidateSnapshot } = await importCandidates();
  const { candidates, summary } = buildGreetingCandidateSnapshot({
    month: 2,
    day: 24,
    memberships: [
      {
        userId: "u1",
        user: {
          email: "u1@example.com",
          name: "User One",
          birthdayMonth: 2,
          birthdayDay: 24,
          anniversaryMonth: null,
          anniversaryDay: null
        }
      }
    ],
    sentLogs: []
  });

  assert.equal(summary.sendableToday, 1);
  assert.equal(summary.alreadySentToday, 0);
  assert.equal(candidates[0]?.alreadySentBirthday, false);
  assert.equal(candidates[0]?.sendBirthday, true);
});

test("buildGreetingCandidateSnapshot excludes candidates without email from sendable count", async () => {
  const { buildGreetingCandidateSnapshot } = await importCandidates();
  const { candidates, summary } = buildGreetingCandidateSnapshot({
    month: 2,
    day: 24,
    memberships: [
      {
        userId: "u1",
        user: {
          email: "",
          name: "No Email",
          birthdayMonth: 2,
          birthdayDay: 24,
          anniversaryMonth: null,
          anniversaryDay: null
        }
      },
      {
        userId: "u2",
        user: {
          email: "u2@example.com",
          name: "Has Email",
          birthdayMonth: 2,
          birthdayDay: 24,
          anniversaryMonth: null,
          anniversaryDay: null
        }
      }
    ],
    sentLogs: []
  });

  assert.equal(candidates.length, 1);
  assert.equal(summary.sendableToday, 1);
  assert.equal(summary.missingEmailMemberships, 1);
});

// ---------------------------------------------------------------------------
// 3. sendGreetingEmailIfEligible: log only after success
// ---------------------------------------------------------------------------

test("sendGreetingEmailIfEligible creates log only after SENT, not after FAILED", async () => {
  const { sendGreetingEmailIfEligible } = await importGreetings();

  const calls: string[] = [];

  const fakeDb = {
    greetingEmailLog: {
      findUnique: async () => null,
      create: async () => {
        calls.push("create-log");
        return { id: "g1" };
      }
    }
  };

  // SENT → should create log
  const sentResult = await sendGreetingEmailIfEligible(
    {
      parishId: "p1",
      parishName: "Parish",
      parishLogoUrl: null,
      userId: "u1",
      userEmail: "u1@example.com",
      userFirstName: "User",
      greetingType: BIRTHDAY,
      templateHtml: null,
      dateKey: "2026-02-24"
    },
    {
      db: fakeDb as never,
      sendEmailFn: async () => {
        calls.push("send-email");
        return { status: "SENT" as const };
      }
    }
  );

  assert.equal(sentResult.status, "SENT");
  assert.deepEqual(calls, ["send-email", "create-log"]);

  // Reset
  calls.length = 0;

  // FAILED → should NOT create log
  const failedResult = await sendGreetingEmailIfEligible(
    {
      parishId: "p1",
      parishName: "Parish",
      parishLogoUrl: null,
      userId: "u1",
      userEmail: "u1@example.com",
      userFirstName: "User",
      greetingType: BIRTHDAY,
      templateHtml: null,
      dateKey: "2026-02-24"
    },
    {
      db: fakeDb as never,
      sendEmailFn: async () => {
        calls.push("send-email");
        return { status: "FAILED" as const };
      }
    }
  );

  assert.equal(failedResult.status, "FAILED");
  assert.deepEqual(calls, ["send-email"]);
});

test("sendGreetingEmailIfEligible skips when log already exists", async () => {
  const { sendGreetingEmailIfEligible } = await importGreetings();

  const fakeDb = {
    greetingEmailLog: {
      findUnique: async () => ({ id: "existing" }),
      create: async () => {
        throw new Error("should not create");
      }
    }
  };

  const result = await sendGreetingEmailIfEligible(
    {
      parishId: "p1",
      parishName: "Parish",
      parishLogoUrl: null,
      userId: "u1",
      userEmail: "u1@example.com",
      userFirstName: "User",
      greetingType: BIRTHDAY,
      templateHtml: null,
      dateKey: "2026-02-24"
    },
    {
      db: fakeDb as never,
      sendEmailFn: async () => {
        throw new Error("should not send");
      }
    }
  );

  assert.equal(result.status, "SKIPPED");
});
