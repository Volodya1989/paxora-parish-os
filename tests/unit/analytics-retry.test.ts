import { describe, test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Risk 4 — Analytics transport retry logic", () => {
  const analyticsPath = path.join(process.cwd(), "lib/analytics.ts");

  test("analytics.ts exports fetchWithRetry function", () => {
    const source = fs.readFileSync(analyticsPath, "utf8");
    assert.match(source, /export async function fetchWithRetry/, "Must export fetchWithRetry");
  });

  test("fetchWithRetry implements exponential backoff with configurable retries", () => {
    const source = fs.readFileSync(analyticsPath, "utf8");

    // Extract the fetchWithRetry function body
    const fnMatch = source.match(/export async function fetchWithRetry[\s\S]*?\n\}/);
    assert.ok(fnMatch, "fetchWithRetry function must exist");
    const fnBody = fnMatch[0];

    // Must have retry loop
    assert.match(fnBody, /for\s*\(/, "Must use a loop for retries");

    // Must have exponential backoff
    assert.match(fnBody, /Math\.pow\(2/, "Must use exponential backoff (Math.pow(2, ...))");

    // Must have setTimeout-based delay
    assert.match(fnBody, /setTimeout/, "Must use setTimeout for delay between retries");

    // Must distinguish server errors from client errors
    assert.match(fnBody, /status\s*<\s*500/, "Must distinguish 5xx from 4xx (no retry on client errors)");
  });

  test("createPosthogTransport uses fetchWithRetry instead of raw fetch", () => {
    const source = fs.readFileSync(analyticsPath, "utf8");

    // Extract the transport function
    const transportMatch = source.match(/function createPosthogTransport[\s\S]*?\n\}/);
    assert.ok(transportMatch, "createPosthogTransport must exist");
    const transportBody = transportMatch[0];

    assert.match(transportBody, /fetchWithRetry/, "Must use fetchWithRetry in transport");
  });

  test("RETRY_ATTEMPTS and RETRY_BASE_MS constants are defined", () => {
    const source = fs.readFileSync(analyticsPath, "utf8");
    assert.match(source, /RETRY_ATTEMPTS\s*=\s*\d+/, "Must define RETRY_ATTEMPTS constant");
    assert.match(source, /RETRY_BASE_MS\s*=\s*\d+/, "Must define RETRY_BASE_MS constant");
  });

  test("fetchWithRetry retries on network failure and succeeds on recovery", async () => {
    // Dynamic import to test the actual function
    const { fetchWithRetry } = await import("@/lib/analytics");

    let callCount = 0;
    const originalFetch = globalThis.fetch;

    // Mock fetch: fail first call, succeed second
    globalThis.fetch = (async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Network error");
      }
      return new Response("ok", { status: 200 });
    }) as typeof globalThis.fetch;

    try {
      const response = await fetchWithRetry("https://example.com/capture/", {
        method: "POST",
        body: "{}"
      }, 2, 10); // Short delay for test speed

      assert.equal(response.status, 200, "Should eventually succeed");
      assert.equal(callCount, 2, "Should have retried once after initial failure");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("fetchWithRetry does not retry on 4xx client errors", async () => {
    const { fetchWithRetry } = await import("@/lib/analytics");

    let callCount = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      callCount++;
      return new Response("Bad Request", { status: 400 });
    }) as typeof globalThis.fetch;

    try {
      const response = await fetchWithRetry("https://example.com/capture/", {
        method: "POST",
        body: "{}"
      }, 2, 10);

      assert.equal(response.status, 400, "Should return the 400 response");
      assert.equal(callCount, 1, "Should not retry on 4xx errors");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("fetchWithRetry retries on 5xx server errors", async () => {
    const { fetchWithRetry } = await import("@/lib/analytics");

    let callCount = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
      callCount++;
      if (callCount <= 2) {
        return new Response("Server Error", { status: 500 });
      }
      return new Response("ok", { status: 200 });
    }) as typeof globalThis.fetch;

    try {
      const response = await fetchWithRetry("https://example.com/capture/", {
        method: "POST",
        body: "{}"
      }, 2, 10);

      assert.equal(response.status, 200, "Should succeed after retries");
      assert.equal(callCount, 3, "Should retry twice on 5xx then succeed on third attempt");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
