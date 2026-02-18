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
    replyCount: 0,
    attachments: [],
    reactions: [],
    author: baseAuthor,
    parentMessage: null
  },
  {
    id: "msg-2",
    body: "Second message",
    createdAt: new Date("2024-04-01T10:00:00.000Z"),
    editedAt: null,
    deletedAt: null,
    replyCount: 1,
    attachments: [],
    reactions: [
      {
        emoji: "👍",
        count: 2,
        reactedByMe: true
      }
    ],
    author: { id: "author-2", name: "Jordan" },
    parentMessage: null
  },
  {
    id: "msg-3",
    body: "Later day",
    createdAt: new Date("2024-04-02T09:00:00.000Z"),
    editedAt: null,
    deletedAt: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    author: baseAuthor,
    parentMessage: null
  }
];

const pinnedMessage = {
  id: "pin-1",
  messageId: "msg-pin",
  pinnedAt: new Date("2024-04-02T12:00:00.000Z"),
  pinnedBy: baseAuthor,
  message: {
    id: "msg-pin",
    body: "Pinned note",
    createdAt: new Date("2024-04-02T08:30:00.000Z"),
    editedAt: null,
    deletedAt: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    author: baseAuthor,
    parentMessage: null
  }
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

test("ChatThread shows thread affordance and reactions", () => {
  const markup = renderToStaticMarkup(
    createElement(ChatThread, {
      messages,
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "author-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      onToggleReaction: () => undefined,
      onViewThread: () => undefined,
      isLoading: false
    })
  );

  assert.ok(markup.includes("View thread (1)"));
  assert.ok(markup.includes("👍"));
});

test("ChatThread wraps long message text", () => {
  const longMessage = {
    id: "msg-long",
    body: "Supercalifragilisticexpialidocious".repeat(5),
    createdAt: new Date("2024-04-03T09:00:00.000Z"),
    editedAt: null,
    deletedAt: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    author: baseAuthor,
    parentMessage: null
  };

  const markup = renderToStaticMarkup(
    createElement(ChatThread, {
      messages: [longMessage],
      pinnedMessage: null,
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

  assert.ok(markup.includes("break-word"));
});

test("ChatThread renders fixed emoji menu when opened", () => {
  const markup = renderToStaticMarkup(
    createElement(ChatThread, {
      messages,
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "author-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      onToggleReaction: () => undefined,
      initialReactionMenuMessageId: "msg-1",
      isLoading: false
    })
  );

  assert.ok(markup.includes("👍"));
  assert.ok(markup.includes("❤️"));
});


test("ChatThread shows outgoing read indicator even when snapshot is unavailable", () => {
  const markup = renderToStaticMarkup(
    createElement(ChatThread, {
      messages: [messages[0]],
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "author-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      isLoading: false,
      readIndicatorSnapshot: null
    })
  );

  assert.ok(markup.includes("Message sent"));
});


test("ChatThread shows read indicator on incoming message too", () => {
  const markup = renderToStaticMarkup(
    createElement(ChatThread, {
      messages: [messages[1]],
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "author-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      isLoading: false,
      readIndicatorSnapshot: null
    })
  );

  assert.ok(markup.includes("Message delivered"));
});
