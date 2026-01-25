import { test } from "node:test";
import assert from "node:assert/strict";
import type { EmailLog } from "@prisma/client";
import { shouldSendEmail } from "@/lib/email/rules";
import { selectJoinRequestAdminRecipients } from "@/lib/email/joinRequests";
import { isWeeklyDigestAlreadySent } from "@/lib/email/logs";

test("shouldSendEmail respects category rules", () => {
  assert.equal(shouldSendEmail("TRANSACTIONAL", null), true);
  assert.equal(
    shouldSendEmail("NOTIFICATION", { notifyEmailEnabled: true, weeklyDigestEnabled: false }),
    true
  );
  assert.equal(
    shouldSendEmail("NOTIFICATION", { notifyEmailEnabled: false, weeklyDigestEnabled: true }),
    false
  );
  assert.equal(
    shouldSendEmail("DIGEST", { notifyEmailEnabled: true, weeklyDigestEnabled: true }),
    true
  );
  assert.equal(
    shouldSendEmail("DIGEST", { notifyEmailEnabled: true, weeklyDigestEnabled: false }),
    false
  );
});

test("selectJoinRequestAdminRecipients filters by role and toggle", () => {
  const recipients = selectJoinRequestAdminRecipients([
    {
      userId: "user-1",
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      notifyEmailEnabled: true
    },
    {
      userId: "user-2",
      email: "shepherd@example.com",
      name: "Shepherd",
      role: "SHEPHERD",
      notifyEmailEnabled: true
    },
    {
      userId: "user-3",
      email: "member@example.com",
      name: "Member",
      role: "MEMBER",
      notifyEmailEnabled: true
    },
    {
      userId: "user-4",
      email: "muted@example.com",
      name: "Muted",
      role: "ADMIN",
      notifyEmailEnabled: false
    }
  ]);

  assert.deepEqual(
    recipients.map((recipient) => recipient.email).sort(),
    ["admin@example.com", "shepherd@example.com"].sort()
  );
});

test("isWeeklyDigestAlreadySent enforces idempotency", () => {
  assert.equal(isWeeklyDigestAlreadySent(null), false);

  const sentLog = {
    id: "log-1",
    type: "DIGEST",
    template: "weeklyDigest",
    toEmail: "person@example.com",
    status: "SENT"
  } as EmailLog;

  const failedLog = {
    id: "log-2",
    type: "DIGEST",
    template: "weeklyDigest",
    toEmail: "person@example.com",
    status: "FAILED"
  } as EmailLog;

  assert.equal(isWeeklyDigestAlreadySent(sentLog), true);
  assert.equal(isWeeklyDigestAlreadySent(failedLog), false);
});
