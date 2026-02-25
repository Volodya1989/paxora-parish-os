import { test } from "node:test";
import assert from "node:assert/strict";
import { runGreetingsCronJob } from "@/lib/email/greetingsCron";

function buildFakeDb() {
  const updates: Array<{ data: Record<string, unknown> }> = [];

  const db = {
    parish: {
      findMany: async () => [
        {
          id: "p1",
          name: "St. Mark",
          timezone: "America/New_York",
          logoUrl: null,
          greetingsEnabled: true,
          birthdayGreetingTemplate: null,
          anniversaryGreetingTemplate: null,
          greetingsSendHourLocal: 9,
          greetingsSendMinuteLocal: 0
        }
      ]
    },
    greetingCronRunLog: {
      create: async () => ({ id: "run_1" }),
      update: async (input: { data: Record<string, unknown> }) => {
        updates.push(input);
        return input;
      }
    }
  };

  return { db: db as never, updates };
}

test("greetings cron sends today's greeting and records successful run", async () => {
  const { db, updates } = buildFakeDb();

  const summary = await runGreetingsCronJob({
    requestId: "req-1",
    db,
    nowUtc: new Date("2026-05-10T14:00:00.000Z"),
    getCandidatesFn: async () => ({
      candidates: [
        {
          userId: "u1",
          firstName: "Alex",
          email: "alex@example.com",
          sendBirthday: true,
          sendAnniversary: false,
          alreadySentBirthday: false,
          alreadySentAnniversary: false
        }
      ],
      summary: {
        optedInMemberships: 1,
        dateMatchedMemberships: 1,
        missingEmailMemberships: 0,
        alreadySentToday: 0,
        sendableToday: 1
      }
    }),
    sendGreetingFn: async () => ({ status: "SENT" })
  });

  assert.equal(summary.sent, 1);
  assert.equal(summary.failed, 0);
  assert.equal(summary.emailsAttempted, 1);
  assert.equal(updates.length, 1);
  assert.equal(updates[0]?.data?.status, "SUCCESS");
});

test("greetings cron records FAILED sends and keeps run successful", async () => {
  const { db, updates } = buildFakeDb();

  const summary = await runGreetingsCronJob({
    requestId: "req-2",
    db,
    nowUtc: new Date("2026-05-10T14:00:00.000Z"),
    getCandidatesFn: async () => ({
      candidates: [
        {
          userId: "u1",
          firstName: "Alex",
          email: "alex@example.com",
          sendBirthday: true,
          sendAnniversary: false,
          alreadySentBirthday: false,
          alreadySentAnniversary: false
        }
      ],
      summary: {
        optedInMemberships: 1,
        dateMatchedMemberships: 1,
        missingEmailMemberships: 0,
        alreadySentToday: 0,
        sendableToday: 1
      }
    }),
    sendGreetingFn: async () => ({ status: "FAILED" })
  });

  assert.equal(summary.sent, 0);
  assert.equal(summary.failed, 1);
  assert.equal(summary.emailsAttempted, 1);
  assert.equal(updates[0]?.data?.failedCount, 1);
});

test("greetings cron surfaces missing env configuration in summary and run log", async () => {
  const { db, updates } = buildFakeDb();
  const prevResend = process.env.RESEND_API_KEY;
  const prevFrom = process.env.EMAIL_FROM;
  const prevFromDefault = process.env.EMAIL_FROM_DEFAULT;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_FROM_DEFAULT;

  try {
    const summary = await runGreetingsCronJob({
      requestId: "req-3",
      db,
      nowUtc: new Date("2026-05-10T14:00:00.000Z"),
      getCandidatesFn: async () => ({
        candidates: [
          {
            userId: "u1",
            firstName: "Alex",
            email: "alex@example.com",
            sendBirthday: true,
            sendAnniversary: false,
            alreadySentBirthday: false,
            alreadySentAnniversary: false
          }
        ],
        summary: {
          optedInMemberships: 1,
          dateMatchedMemberships: 1,
          missingEmailMemberships: 0,
          alreadySentToday: 0,
          sendableToday: 1
        }
      }),
      sendGreetingFn: async () => ({ status: "FAILED" })
    });

    assert.deepEqual(summary.missingEnv, ["RESEND_API_KEY", "EMAIL_FROM/EMAIL_FROM_DEFAULT"]);
    assert.equal(summary.reasonCounts.missingEmailConfig, 1);
    assert.deepEqual(updates[0]?.data?.missingEnv, ["RESEND_API_KEY", "EMAIL_FROM/EMAIL_FROM_DEFAULT"]);
  } finally {
    process.env.RESEND_API_KEY = prevResend;
    process.env.EMAIL_FROM = prevFrom;
    process.env.EMAIL_FROM_DEFAULT = prevFromDefault;
  }
});

test("greetings cron is idempotent when greeting already sent today", async () => {
  const { db } = buildFakeDb();
  let sendCalls = 0;

  const summary = await runGreetingsCronJob({
    requestId: "req-4",
    db,
    nowUtc: new Date("2026-05-10T14:00:00.000Z"),
    getCandidatesFn: async () => ({
      candidates: [
        {
          userId: "u1",
          firstName: "Alex",
          email: "alex@example.com",
          sendBirthday: true,
          sendAnniversary: false,
          alreadySentBirthday: true,
          alreadySentAnniversary: false
        }
      ],
      summary: {
        optedInMemberships: 1,
        dateMatchedMemberships: 1,
        missingEmailMemberships: 0,
        alreadySentToday: 1,
        sendableToday: 0
      }
    }),
    sendGreetingFn: async () => {
      sendCalls += 1;
      return { status: "SENT" };
    }
  });

  assert.equal(sendCalls, 0);
  assert.equal(summary.emailsAttempted, 0);
  assert.equal(summary.sent, 0);
  assert.equal(summary.failed, 0);
});

