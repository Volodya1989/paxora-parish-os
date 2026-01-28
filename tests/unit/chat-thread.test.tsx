import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChatThread from "@/components/chat/ChatThread";

const baseAuthor = { id: "author-1", name: "Patricia Parish" };

const messages = [
  {
    id: "msg-1",
    body: "First message",
    createdAt: new Date("2024-04-01T09:00:00.000Z"),
    editedAt: null,
    deletedAt: null,
    author: baseAuthor,
    parentMessage: null
  },
  {
    id: "msg-2",
    body: "Second message",
    createdAt: new Date("2024-04-01T10:00:00.000Z"),
    editedAt: null,
    deletedAt: null,
    author: { id: "author-2", name: "Jordan" },
    parentMessage: null
  },
  {
    id: "msg-3",
    body: "Later day",
    createdAt: new Date("2024-04-02T09:00:00.000Z"),
    editedAt: null,
    deletedAt: null,
    author: baseAuthor,
    parentMessage: null
  }
];

const pinnedMessage = {
  id: "pin-1",
  messageId: "msg-2",
  pinnedAt: new Date("2024-04-02T12:00:00.000Z"),
  pinnedBy: baseAuthor,
  message: messages[1]!
};

test("ChatThread renders pinned banner and message order", () => {
  const markup = renderToStaticMarkup(
    createElement(ChatThread, {
      messages,
      pinnedMessage,
      canModerate: false,
      currentUserId: "author-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      isLoading: false
    })
  );

  assert.ok(markup.includes("Pinned"));
  assert.ok(markup.includes("Second message"));

  const firstIndex = markup.indexOf("First message");
  const secondIndex = markup.indexOf("Second message");
  const thirdIndex = markup.indexOf("Later day");

  assert.ok(firstIndex < secondIndex);
  assert.ok(secondIndex < thirdIndex);
});
