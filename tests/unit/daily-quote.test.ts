import { test, mock } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_QUOTE_HIDE_MS,
  formatLocalDateKey,
  scheduleDailyQuoteHide,
  shouldShowDailyQuote
} from "@/lib/ui/dailyQuote";

test("formatLocalDateKey uses local YYYY-MM-DD", () => {
  const date = new Date(2026, 1, 3, 8, 30, 0);
  assert.equal(formatLocalDateKey(date), "2026-02-03");
});

test("shouldShowDailyQuote hides once already shown for today", () => {
  assert.equal(shouldShowDailyQuote("2026-02-03", "2026-02-03"), false);
  assert.equal(shouldShowDailyQuote("2026-02-02", "2026-02-03"), true);
  assert.equal(shouldShowDailyQuote(null, "2026-02-03"), true);
});

test("scheduleDailyQuoteHide fires after configured duration", () => {
  mock.timers.enable({ apis: ["setTimeout"] });

  let hidden = false;
  scheduleDailyQuoteHide({
    hideAfterMs: DAILY_QUOTE_HIDE_MS,
    onHide: () => {
      hidden = true;
    }
  });

  mock.timers.tick(DAILY_QUOTE_HIDE_MS - 1);
  assert.equal(hidden, false);

  mock.timers.tick(1);
  assert.equal(hidden, true);

  mock.timers.reset();
});
