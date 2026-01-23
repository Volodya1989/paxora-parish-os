import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ListSkeleton from "@/components/app/list-skeleton";

test("ListSkeleton renders multiple rows", () => {
  const markup = renderToStaticMarkup(createElement(ListSkeleton, { rows: 3 }));
  const matches = markup.match(/animate-pulse/g) ?? [];
  assert.equal(matches.length, 6);
});
