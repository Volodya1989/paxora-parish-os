import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleLocaleRouting } from "@/lib/i18n/localeMiddleware";

function createRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

test("middleware redirects / to default locale", () => {
  const request = createRequest("http://localhost/");
  const response = handleLocaleRouting(request);

  assert.equal(response.headers.get("location"), "http://localhost/en");
});

test("middleware uses locale cookie when present", () => {
  const request = createRequest("http://localhost/", { cookie: "NEXT_LOCALE=uk" });
  const response = handleLocaleRouting(request);

  assert.equal(response.headers.get("location"), "http://localhost/uk");
});

test("middleware allows prefixed locale paths", () => {
  const request = createRequest("http://localhost/uk/announcements");
  const response = handleLocaleRouting(request);

  assert.equal(response.headers.get("location"), null);
  assert.equal(response.cookies.get("NEXT_LOCALE")?.value, "uk");
});


test("middleware rejects invalid locale prefixes", () => {
  const request = createRequest("http://localhost/es/announcements");
  const response = handleLocaleRouting(request);

  assert.equal(response.headers.get("x-middleware-rewrite"), "http://localhost/404");
});

test("middleware falls back to default for unsupported Accept-Language", () => {
  const request = createRequest("http://localhost/", { "accept-language": "es-MX,es;q=0.9" });
  const response = handleLocaleRouting(request);

  assert.equal(response.headers.get("location"), "http://localhost/en");
});
