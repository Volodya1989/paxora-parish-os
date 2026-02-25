import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { isGreetingEmailDuplicateError } from "@/lib/email/greetings";

test("isGreetingEmailDuplicateError matches Prisma unique constraint errors", () => {
  const error = new Prisma.PrismaClientKnownRequestError("dup", {
    code: "P2002",
    clientVersion: "5.22.0"
  });

  assert.equal(isGreetingEmailDuplicateError(error), true);
});

test("isGreetingEmailDuplicateError ignores other errors", () => {
  assert.equal(isGreetingEmailDuplicateError(new Error("nope")), false);
});
