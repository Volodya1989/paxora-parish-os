import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import Sidebar from "@/components/navigation/Sidebar";
import { buildSignOutHandler } from "@/components/navigation/SignOutButton";
import { withI18n } from "@/tests/utils/i18n";

test("Sidebar renders primary nav with This Week first and active state", () => {
  const markup = renderToStaticMarkup(
    withI18n(createElement(Sidebar, { currentPath: "/this-week", initialCollapsed: false }))
  );

  assert.ok(markup.indexOf("This Week") < markup.indexOf("Serve"));
  assert.ok(markup.indexOf("Serve") < markup.indexOf("Groups"));
  assert.ok(markup.indexOf("Groups") < markup.indexOf("Calendar"));
  assert.match(markup, /<nav[^>]*aria-label="Primary"/);
  assert.match(
    markup,
    /href="\/this-week"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/this-week"/
  );
  assert.match(markup, /Profile/);
  assert.match(markup, /Sign out/);
});

test("Sidebar collapse toggle updates labels", () => {
  const expandedMarkup = renderToStaticMarkup(
    withI18n(createElement(Sidebar, { currentPath: "/tasks", collapsed: false }))
  );
  assert.match(expandedMarkup, /aria-label="Collapse sidebar"/);

  const collapsedMarkup = renderToStaticMarkup(
    withI18n(createElement(Sidebar, { currentPath: "/tasks", collapsed: true }))
  );
  assert.match(collapsedMarkup, /aria-label="Expand sidebar"/);
});

test("Sign out handler is invoked", async () => {
  let called = false;
  const handler = buildSignOutHandler(() => {
    called = true;
  });

  await handler();
  assert.equal(called, true);
});
