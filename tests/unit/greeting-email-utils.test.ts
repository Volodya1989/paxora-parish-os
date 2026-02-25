import { test } from "node:test";
import assert from "node:assert/strict";

test("isGreetingEmailDuplicateError matches Prisma unique constraint errors", async () => {
  const { Prisma } = await import("@prisma/client");
  const { isGreetingEmailDuplicateError } = await import("@/lib/email/greetings");

  const error = new Prisma.PrismaClientKnownRequestError("dup", {
    code: "P2002",
    clientVersion: "5.22.0"
  });

  assert.equal(isGreetingEmailDuplicateError(error), true);
});

test("isGreetingEmailDuplicateError ignores other errors", async () => {
  const { isGreetingEmailDuplicateError } = await import("@/lib/email/greetings");
  assert.equal(isGreetingEmailDuplicateError(new Error("nope")), false);
});
