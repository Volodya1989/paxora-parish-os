import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGreetingCandidateSnapshot } from "@/lib/email/greetingCandidates";

test("buildGreetingCandidateSnapshot tracks sendable and already-sent reasons", () => {
  const result = buildGreetingCandidateSnapshot({
    month: 2,
    day: 14,
    memberships: [
      {
        userId: "u1",
        user: {
          email: "one@example.com",
          name: "One Person",
          birthdayMonth: 2,
          birthdayDay: 14,
          anniversaryMonth: null,
          anniversaryDay: null
        }
      },
      {
        userId: "u2",
        user: {
          email: "two@example.com",
          name: "Two Person",
          birthdayMonth: 2,
          birthdayDay: 14,
          anniversaryMonth: 2,
          anniversaryDay: 14
        }
      },
      {
        userId: "u3",
        user: {
          email: "",
          name: "No Email",
          birthdayMonth: 2,
          birthdayDay: 14,
          anniversaryMonth: null,
          anniversaryDay: null
        }
      }
    ],
    sentLogs: [{ userId: "u2", type: "BIRTHDAY" }]
  });

  assert.equal(result.summary.optedInMemberships, 3);
  assert.equal(result.summary.missingEmailMemberships, 1);
  assert.equal(result.summary.alreadySentToday, 1);
  assert.equal(result.summary.sendableToday, 2);
  assert.equal(result.summary.dateMatchedMemberships, 3);

  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[1]?.alreadySentBirthday, true);
  assert.equal(result.candidates[1]?.alreadySentAnniversary, false);
});
