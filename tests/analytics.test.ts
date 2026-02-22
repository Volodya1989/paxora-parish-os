import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnalyticsClient } from "@/lib/analytics";
import { createPageViewTracker } from "@/lib/analytics-pageviews";

test("analytics client is a no-op when disabled", async () => {
  const sent: Array<{ event: string; properties: Record<string, unknown> }> = [];
  const analytics = createAnalyticsClient({
    env: { enabled: "false", key: "phc_test" },
    transport: async (payload) => {
      sent.push({ event: payload.event, properties: payload.properties as Record<string, unknown> });
    },
    getWindow: () => ({}) as Window
  });

  analytics.track("test_event", { feature: "x" });
  analytics.page("/home");
  analytics.identify("user-1");

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sent.length, 0);
});

test("analytics client dispatches events when enabled", async () => {
  const sent: Array<{ event: string; properties: Record<string, unknown> }> = [];
  const analytics = createAnalyticsClient({
    env: { enabled: "true", key: "phc_test" },
    transport: async (payload) => {
      sent.push({ event: payload.event, properties: payload.properties as Record<string, unknown> });
    },
    getWindow: () => ({}) as Window
  });

  analytics.setGlobalProperties({ parishId: "p1", role: "ADMIN", locale: "en" });
  analytics.track("task_completed", { taskId: "t1" });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.event, "task_completed");
  assert.equal(sent[0]?.properties.parishId, "p1");
  assert.equal(sent[0]?.properties.taskId, "t1");
});

test("page view tracker records route changes once per unique path", () => {
  const paths: string[] = [];
  const track = createPageViewTracker((path) => {
    paths.push(path);
  });

  track("/en/home", "");
  track("/en/home", "");
  track("/en/home", "tab=1");
  track("/en/home", "tab=1");
  track("/en/tasks", "");

  assert.deepEqual(paths, ["/en/home", "/en/home?tab=1", "/en/tasks"]);
});
