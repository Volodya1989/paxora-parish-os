import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PARISH_INVITE_CODE_CHARSET,
  generateParishInviteCode,
  generateUniqueParishInviteCode
} from "@/lib/parish/inviteCode";

test("parish invite code uses expected length and charset", () => {
  const code = generateParishInviteCode();
  assert.equal(code.length, 7);
  assert.match(code, /^[A-Z0-9]+$/);

  for (const char of code) {
    assert.ok(PARISH_INVITE_CODE_CHARSET.includes(char));
  }
});

test("parish invite code excludes ambiguous characters", () => {
  const code = generateParishInviteCode(8);
  assert.equal(code.length, 8);
  assert.equal(code.includes("0"), false);
  assert.equal(code.includes("1"), false);
  assert.equal(code.includes("I"), false);
  assert.equal(code.includes("L"), false);
  assert.equal(code.includes("O"), false);
});

test("parish invite code retries for uniqueness", async () => {
  const seen = new Set<string>();
  let checks = 0;

  const uniqueCode = await generateUniqueParishInviteCode(
    async (candidate) => {
      checks += 1;
      if (checks === 1) {
        return true;
      }
      const exists = seen.has(candidate);
      seen.add(candidate);
      return exists;
    },
    { maxAttempts: 10, length: 6 }
  );

  assert.equal(uniqueCode.length, 6);
  assert.ok(checks >= 2);
});
