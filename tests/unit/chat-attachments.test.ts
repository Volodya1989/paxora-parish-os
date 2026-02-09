import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CHAT_ATTACHMENTS,
  MAX_CHAT_ATTACHMENT_SIZE,
  CHAT_ATTACHMENT_MIME_TYPES,
  isSupportedChatAttachment
} from "@/lib/chat/attachments";

test("constants have expected values", () => {
  assert.equal(MAX_CHAT_ATTACHMENTS, 3);
  assert.equal(MAX_CHAT_ATTACHMENT_SIZE, 5 * 1024 * 1024);
  assert.ok(CHAT_ATTACHMENT_MIME_TYPES.includes("image/jpeg"));
  assert.ok(CHAT_ATTACHMENT_MIME_TYPES.includes("image/png"));
  assert.ok(CHAT_ATTACHMENT_MIME_TYPES.includes("image/webp"));
  assert.ok(CHAT_ATTACHMENT_MIME_TYPES.includes("image/gif"));
});

test("isSupportedChatAttachment accepts valid MIME types", () => {
  assert.ok(isSupportedChatAttachment("image/jpeg"));
  assert.ok(isSupportedChatAttachment("image/png"));
  assert.ok(isSupportedChatAttachment("image/webp"));
  assert.ok(isSupportedChatAttachment("image/gif"));
});

test("isSupportedChatAttachment rejects invalid MIME types", () => {
  assert.equal(isSupportedChatAttachment("image/svg+xml"), false);
  assert.equal(isSupportedChatAttachment("application/pdf"), false);
  assert.equal(isSupportedChatAttachment("text/html"), false);
  assert.equal(isSupportedChatAttachment("application/javascript"), false);
  assert.equal(isSupportedChatAttachment(""), false);
});
