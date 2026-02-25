import { test } from "node:test";
import assert from "node:assert/strict";

const BIRTHDAY = "BIRTHDAY" as const;

const baseInput = {
  parishId: "p1",
  parishName: "Parish",
  parishLogoUrl: null,
  userId: "u1",
  userEmail: "u1@example.com",
  userFirstName: "U1",
  greetingType: BIRTHDAY,
  templateHtml: null,
  dateKey: "2026-02-24"
};

test("sendGreetingEmailIfEligible writes greeting log only after successful send", async () => {
  const { sendGreetingEmailIfEligible } = await import("@/lib/email/greetings");
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

  const sent = await sendGreetingEmailIfEligible(baseInput, {
    db: fakeDb as never,
    sendEmailFn: async () => {
      calls.push("send-email");
      return { status: "SENT" as const };
    }
  });

  assert.equal(sent.status, "SENT");
  assert.deepEqual(calls, ["send-email", "create-log"]);
});

test("sendGreetingEmailIfEligible does not write greeting log when send fails", async () => {
  const { sendGreetingEmailIfEligible } = await import("@/lib/email/greetings");
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

  const failed = await sendGreetingEmailIfEligible(baseInput, {
    db: fakeDb as never,
    sendEmailFn: async () => {
      calls.push("send-email");
      return { status: "FAILED" as const };
    }
  });

  assert.equal(failed.status, "FAILED");
  assert.deepEqual(calls, ["send-email"]);
});
