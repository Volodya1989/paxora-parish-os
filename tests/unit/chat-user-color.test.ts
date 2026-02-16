import { test } from "node:test";
import assert from "node:assert/strict";
import { containsEmoji } from "@/lib/chat/emoji";
import { getUserColor } from "@/lib/chat/userColor";

test("getUserColor returns stable colors for same user", () => {
  const first = getUserColor("user-123");
  const second = getUserColor("user-123");

  assert.equal(first, second);
});

test("getUserColor distributes across palette for different users", () => {
  const colorA = getUserColor("user-a");
  const colorB = getUserColor("user-b");

  assert.ok(colorA.startsWith("var(--chat-name-color-"));
  assert.ok(colorB.startsWith("var(--chat-name-color-"));
});

test("containsEmoji detects emoji and ignores plain text", () => {
  assert.equal(containsEmoji("Hello 👋"), true);
  assert.equal(containsEmoji("Plain text only"), false);
});
