import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import MobileTabs from "@/components/navigation/MobileTabs";
import { withI18n } from "@/tests/utils/i18n";

test("Mobile tabs render 6 tabs with active state", () => {
  const markup = renderToStaticMarkup(
    withI18n(createElement(MobileTabs, { currentPath: "/groups", isMoreOpen: false }))
  );

  const tabMatches = markup.match(/data-testid="tab-/g) ?? [];
  assert.equal(tabMatches.length, 6);
  assert.match(
    markup,
    /data-testid="tab-groups"[^>]*aria-current="page"|aria-current="page"[^>]*data-testid="tab-groups"/
  );
  assert.doesNotMatch(markup, /data-testid="tab-more"[^>]*aria-current="page"/);
});

test("More drawer contains expected items", () => {
  const openMarkup = renderToStaticMarkup(
    withI18n(
      createElement(MobileTabs, {
        currentPath: "/tasks",
        isMoreOpen: true,
        onMoreOpenChange: () => undefined,
        parishRole: "ADMIN"
      })
    )
  );

  assert.match(openMarkup, /role="dialog"/);
  assert.match(openMarkup, /Announcements/);
  assert.match(openMarkup, /People/);
  assert.match(openMarkup, /Profile/);
  assert.match(openMarkup, /Sign out/);
});
