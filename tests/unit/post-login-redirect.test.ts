import { test } from "node:test";
import assert from "node:assert/strict";
import { getPostLoginRedirect } from "@/lib/auth/postLoginRedirect";

test("Admins land on This Week", () => {
  assert.equal(getPostLoginRedirect("ADMIN"), "/this-week");
});

test("Shepherds land on This Week", () => {
  assert.equal(getPostLoginRedirect("SHEPHERD"), "/this-week");
});

test("Members land on opportunities", () => {
  assert.equal(getPostLoginRedirect("MEMBER"), "/tasks?view=opportunities");
});

test("Missing role lands on opportunities", () => {
  assert.equal(getPostLoginRedirect(null), "/tasks?view=opportunities");
});
