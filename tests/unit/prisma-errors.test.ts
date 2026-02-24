import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { isMissingColumnError } from "@/lib/prisma/errors";

test("isMissingColumnError detects P2022", () => {
  const error = new Prisma.PrismaClientKnownRequestError("missing", {
    code: "P2022",
    clientVersion: "5.22.0",
    meta: { column: "Membership.allowParishGreetings" }
  });

  assert.equal(isMissingColumnError(error), true);
  assert.equal(isMissingColumnError(error, "Membership.allowParishGreetings"), true);
  assert.equal(isMissingColumnError(error, "Membership.otherColumn"), false);
});

test("isMissingColumnError ignores non-P2022 errors", () => {
  const dup = new Prisma.PrismaClientKnownRequestError("duplicate", {
    code: "P2002",
    clientVersion: "5.22.0"
  });

  assert.equal(isMissingColumnError(dup), false);
  assert.equal(isMissingColumnError(new Error("x")), false);
});
