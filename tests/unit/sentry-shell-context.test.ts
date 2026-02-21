import test from "node:test";
import assert from "node:assert/strict";
import { buildSentryOptions } from "@/lib/monitoring/sentry-options";
import { applyShellContextTags, toSentryTags } from "@/lib/monitoring/sentry-shell-context";

test("toSentryTags returns stable wrapper tags", () => {
  const tags = toSentryTags({
    platform: "ios",
    shell: "native_wrapper",
    mode: "testflight_wrapper"
  });

  assert.deepEqual(tags, {
    app_platform: "ios",
    app_shell: "native_wrapper",
    app_mode: "testflight_wrapper"
  });
});

test("applyShellContextTags enriches captured event with wrapper context", () => {
  const event = applyShellContextTags(
    { tags: { existing_tag: "keep" } },
    {
      platform: "ios",
      shell: "native_wrapper",
      mode: "testflight_wrapper"
    }
  );

  assert.deepEqual(event.tags, {
    existing_tag: "keep",
    app_platform: "ios",
    app_shell: "native_wrapper",
    app_mode: "testflight_wrapper"
  });
});

test("buildSentryOptions disables Sentry safely when DSN is unset", () => {
  const options = buildSentryOptions({
    dsn: "",
    environment: "development",
    release: undefined,
    tracesSampleRate: undefined,
    shellContext: {
      platform: "web",
      shell: "browser",
      mode: "web"
    }
  });

  assert.equal(options.enabled, false);
  assert.equal(options.tracesSampleRate, 0);
});
