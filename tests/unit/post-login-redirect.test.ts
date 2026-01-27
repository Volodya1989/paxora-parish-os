import { test } from "node:test";
import assert from "node:assert/strict";
import { getPostLoginRedirect } from "@/lib/auth/postLoginRedirect";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { defaultLocale } from "@/lib/i18n/config";

test("Admins land on This Week", () => {
  assert.equal(getPostLoginRedirect("ADMIN"), buildLocalePathname(defaultLocale, "/this-week"));
});

test("Shepherds land on This Week", () => {
  assert.equal(getPostLoginRedirect("SHEPHERD"), buildLocalePathname(defaultLocale, "/this-week"));
});

test("Members land on opportunities", () => {
  assert.equal(
    getPostLoginRedirect("MEMBER"),
    buildLocalePathname(defaultLocale, "/tasks?view=opportunities")
  );
});

test("Missing role lands on opportunities", () => {
  assert.equal(
    getPostLoginRedirect(null),
    buildLocalePathname(defaultLocale, "/tasks?view=opportunities")
  );
});
