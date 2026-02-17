import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_FONT_SIZE_DEFAULT,
  buildChatFontSizeStorageKey,
  clampChatFontSize
} from "@/lib/chat/useChatFontSize";

test("clampChatFontSize enforces 9..18 guardrails", () => {
  assert.equal(clampChatFontSize(5), 9);
  assert.equal(clampChatFontSize(9), 9);
  assert.equal(clampChatFontSize(13.4), 13);
  assert.equal(clampChatFontSize(18.2), 18);
  assert.equal(clampChatFontSize(22), 18);
  assert.equal(clampChatFontSize(30), 18);
});

test("clampChatFontSize falls back to default for invalid values", () => {
  assert.equal(clampChatFontSize(Number.NaN), CHAT_FONT_SIZE_DEFAULT);
  assert.equal(clampChatFontSize(Number.POSITIVE_INFINITY), CHAT_FONT_SIZE_DEFAULT);
});

test("buildChatFontSizeStorageKey scopes by parish and user", () => {
  assert.equal(
    buildChatFontSizeStorageKey("user-1", "parish-7"),
    "paxora.chat.fontSize.parish-7.user-1"
  );
});
