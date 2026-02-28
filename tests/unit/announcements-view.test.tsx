import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import AnnouncementsView from "@/components/announcements/AnnouncementsView";
import { ToastProvider } from "@/components/ui/Toast";
import { withI18n } from "@/tests/utils/i18n";

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
    withI18n(
      createElement(
        AppRouterContext.Provider,
        { value: router as any },
        createElement(
          ToastProvider,
          null,
          createElement(AnnouncementsView, {
            drafts: [],
            published: [],
            canManage: false,
            currentUserId: "user-1",
            canModerateComments: false
          })
        )
      )
    )
  );

  assert.doesNotMatch(markup, /New announcement/);
  assert.match(markup, /No announcements yet/);
});
