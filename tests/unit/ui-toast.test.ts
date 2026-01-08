import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastViewport, createToastHandlers } from "@/components/ui/Toast";

test("Toast viewport announces polite aria-live", () => {
  const markup = renderToStaticMarkup(
    createElement(ToastViewport, {
      toasts: [{ id: "1", title: "Saved", description: "Draft saved." }],
      onDismiss: () => undefined
    })
  );

  assert.match(markup, /aria-live=\"polite\"/);
});

test("Toast undo action fires handler and dismiss works", () => {
  let undoCalled = false;
  let dismissedId = "";

  const toast = {
    id: "toast-1",
    title: "Task archived",
    actionLabel: "Undo",
    onAction: () => {
      undoCalled = true;
    }
  };

  const handlers = createToastHandlers(toast, (id) => {
    dismissedId = id;
  });

  handlers.handleAction();
  handlers.handleDismiss();

  assert.equal(undoCalled, true);
  assert.equal(dismissedId, "toast-1");
});
