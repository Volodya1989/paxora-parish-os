import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChatThread from "@/components/chat/ChatThread";

const parentAuthor = { id: "author-parent", name: "Jordan Reply" };
const childAuthor = { id: "author-child", name: "Patricia Parish" };

const messages = [
  {
    id: "msg-2",
    body: "Following up with a reply.",
    createdAt: new Date("2024-04-02T10:00:00.000Z"),
    editedAt: null,
    deletedAt: null,
    replyCount: 0,
    reactions: [],
    author: childAuthor,
    parentMessage: {
      id: "msg-1",
      body: "Can someone bring extra coffee supplies for Sunday?",
      createdAt: new Date("2024-04-02T09:00:00.000Z"),
      deletedAt: null,
      author: parentAuthor
    }
  }
];

test("ChatThread renders reply preview with parent author", () => {
  const markup = renderToStaticMarkup(
    createElement(ChatThread, {
      messages,
      pinnedMessage: null,
      canModerate: false,
      currentUserId: "author-child",
      onReply: () => undefined,
      onEdit: () => undefined,
      onPin: () => undefined,
      onUnpin: () => undefined,
      onDelete: () => undefined,
      isLoading: false
    })
  );

  assert.ok(markup.includes("Jordan Reply"));
  assert.ok(markup.includes("extra coffee supplies"));
});
