import { test } from "node:test";
import assert from "node:assert/strict";
import { hasAnyImportantDate, shouldShowGreetingsPrompt } from "@/lib/profile/greetingsPrompt";

test("shows prompt when no dates and never prompted", () => {
  assert.equal(
    shouldShowGreetingsPrompt({
      hasAnyImportantDate: false,
      greetingsDoNotAskAgain: false,
      greetingsLastPromptedAt: null
    }),
    true
  );
});

test("hides prompt when do-not-ask-again is set", () => {
  assert.equal(
    shouldShowGreetingsPrompt({
      hasAnyImportantDate: false,
      greetingsDoNotAskAgain: true,
      greetingsLastPromptedAt: null
    }),
    false
  );
});

test("detects any saved important date", () => {
  assert.equal(
    hasAnyImportantDate({
      birthdayMonth: 4,
      birthdayDay: 12,
      anniversaryMonth: null,
      anniversaryDay: null
    }),
    true
  );
});
