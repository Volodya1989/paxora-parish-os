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
  const storage = new Map<string, string>();
  const analytics = createAnalyticsClient({
    env: { enabled: "true", key: "phc_test" },
    transport: async (payload) => {
      sent.push({ event: payload.event, properties: payload.properties as Record<string, unknown> });
    },
    getWindow: () => ({}) as Window,
    getStorage: () => ({
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      }
    })
  });

  analytics.setGlobalProperties({ parishId: "p1", role: "ADMIN", locale: "en" });
  analytics.track("task_completed", { taskId: "t1" });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.event, "task_completed");
  assert.equal(sent[0]?.properties.parishId, "p1");
  assert.equal(sent[0]?.properties.taskId, "t1");
  assert.equal(typeof sent[0]?.properties.distinct_id, "string");
});

test("identify overrides anonymous distinct id", async () => {
  const sent: Array<{ event: string; properties: Record<string, unknown> }> = [];
  const analytics = createAnalyticsClient({
    env: { enabled: "true", key: "phc_test" },
    transport: async (payload) => {
      sent.push({ event: payload.event, properties: payload.properties as Record<string, unknown> });
    },
    getWindow: () => ({}) as Window
  });

  analytics.identify("known-user");
  analytics.track("chat_message_sent", { channelId: "ch1" });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sent[0]?.event, "$identify");
  assert.equal(sent[1]?.event, "chat_message_sent");
  assert.equal(sent[1]?.properties.distinct_id, "known-user");
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
