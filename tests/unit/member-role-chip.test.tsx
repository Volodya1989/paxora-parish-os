import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RoleChip from "@/components/groups/members/RoleChip";

test("RoleChip renders coordinator label", () => {
  const markup = renderToStaticMarkup(createElement(RoleChip, { role: "LEAD" }));

  assert.match(markup, /Coordinator/);
});

test("RoleChip renders clergy label", () => {
  const markup = renderToStaticMarkup(createElement(RoleChip, { role: "SHEPHERD" }));

  assert.match(markup, /Clergy/);
});
