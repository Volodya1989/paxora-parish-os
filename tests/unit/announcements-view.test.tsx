import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import AnnouncementsView from "@/components/announcements/AnnouncementsView";
import { ToastProvider } from "@/components/ui/Toast";

test("Parishioner announcements view hides create actions", () => {
  const router = {
    refresh: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    push: () => undefined,
    prefetch: () => undefined
  };

  const markup = renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router as any },
      createElement(
        ToastProvider,
        null,
        createElement(AnnouncementsView, {
          drafts: [],
          published: [],
          parishId: "parish-1",
          canManage: false
        })
      )
    )
  );

  assert.doesNotMatch(markup, /New Announcement/);
  assert.match(markup, /No announcements yet/);
});
