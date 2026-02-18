import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChatThread from "@/components/chat/ChatThread";
import { I18nProvider } from "@/lib/i18n/provider";
import { getMessages } from "@/lib/i18n/messages";

const enMessages = getMessages("en");

/** Wrap a ChatThread element in the required I18nProvider for SSR tests. */
function renderThread(props: Parameters<typeof ChatThread>[0]) {
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      { locale: "en", messages: enMessages },
      createElement(ChatThread, props)
    )
  );
}

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
  const markup = renderThread({
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
  });

  assert.ok(markup.includes("Pinned"));
  assert.ok(markup.includes("Second message"));

  const firstIndex = markup.indexOf("First message");
  const secondIndex = markup.indexOf("Second message");
  const thirdIndex = markup.indexOf("Later day");

  assert.ok(firstIndex < secondIndex);
  assert.ok(secondIndex < thirdIndex);
});

test("ChatThread shows thread affordance and reactions", () => {
  const markup = renderThread({
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
  });

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

  const markup = renderThread({
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
  });

  assert.ok(markup.includes("break-word"));
});

test("ChatThread renders existing reaction badges on messages", () => {
  const markup = renderThread({
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
      isLoading: false
  });

  // msg-2 has a 👍 reaction badge
  assert.ok(markup.includes("👍"));
});


test("ChatThread shows outgoing read indicator even when snapshot is unavailable", () => {
  const markup = renderThread({
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
  });

  assert.ok(markup.includes("Message sent"));
});


test("ChatThread hides read indicator on incoming messages", () => {
  const markup = renderThread({
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
  });

  // Read indicator should only appear on outgoing messages
  assert.ok(!markup.includes("Message delivered"));
  assert.ok(!markup.includes("Message sent"));
  assert.ok(!markup.includes("Read by"));
  assert.ok(!markup.includes("Not read yet"));
});

test("ChatThread renders gray indicator (text-ink-400) when no recipients have read", () => {
  const msg = {
    id: "msg-out-1",
    body: "Outgoing",
    createdAt: new Date("2024-04-01T09:00:00.000Z"),
    editedAt: null,
    deletedAt: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    author: { id: "sender-1", name: "Sender" },
    parentMessage: null
  };

  const markup = renderThread({
      messages: [msg],
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "sender-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      isLoading: false,
      readIndicatorSnapshot: {
        participantIds: ["sender-1", "reader-1"],
        readAtByUserId: {}
      }
  });

  assert.ok(markup.includes("text-ink-400"), "Expected gray (text-ink-400) class for unread state");
  assert.ok(markup.includes("Not read yet"));
});

test("ChatThread renders amber indicator (text-amber-500) when some recipients have read", () => {
  const msgTime = new Date("2024-04-01T09:00:00.000Z");
  const msg = {
    id: "msg-out-2",
    body: "Partial read",
    createdAt: msgTime,
    editedAt: null,
    deletedAt: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    author: { id: "sender-1", name: "Sender" },
    parentMessage: null
  };

  const markup = renderThread({
      messages: [msg],
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "sender-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      isLoading: false,
      readIndicatorSnapshot: {
        participantIds: ["sender-1", "reader-1", "reader-2"],
        readAtByUserId: {
          "reader-1": msgTime.getTime() + 5000
          // reader-2 has not read
        }
      }
  });

  assert.ok(markup.includes("text-amber-500"), "Expected amber (text-amber-500) class for some_read state");
  assert.ok(markup.includes("Read by 1 of 2"));
});

test("ChatThread renders green indicator (text-emerald-600) when all recipients have read", () => {
  const msgTime = new Date("2024-04-01T09:00:00.000Z");
  const msg = {
    id: "msg-out-3",
    body: "All read",
    createdAt: msgTime,
    editedAt: null,
    deletedAt: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    author: { id: "sender-1", name: "Sender" },
    parentMessage: null
  };

  const markup = renderThread({
      messages: [msg],
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "sender-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      isLoading: false,
      readIndicatorSnapshot: {
        participantIds: ["sender-1", "reader-1", "reader-2"],
        readAtByUserId: {
          "reader-1": msgTime.getTime() + 2000,
          "reader-2": msgTime.getTime() + 3000
        }
      }
  });

  assert.ok(markup.includes("text-emerald-600"), "Expected green (text-emerald-600) class for all_read state");
  assert.ok(markup.includes("Read by everyone"));
});

test("ChatThread adds data-chat-message-id attribute to message rows", () => {
  const markup = renderThread({
      messages: [messages[0]],
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "author-1",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      isLoading: false
  });

  assert.ok(markup.includes('data-chat-message-id="msg-1"'), "Expected data-chat-message-id attribute");
});
