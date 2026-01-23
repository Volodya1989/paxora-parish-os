import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PageShell from "@/components/app/page-shell";

test("PageShell renders title, summary chips, and description", () => {
  const markup = renderToStaticMarkup(
    createElement(
      PageShell,
      {
        title: "Serve",
        description: "Find ways to help.",
        summaryChips: [
          { label: "Week 12", tone: "mist" },
          { label: "4 open", tone: "rose" }
        ],
        actions: createElement("div", null, "Actions")
      },
      createElement("div", null, "Content")
    )
  );

  assert.match(markup, /Serve/);
  assert.match(markup, /Find ways to help\./);
  assert.match(markup, /Week 12/);
  assert.match(markup, /4 open/);
  assert.match(markup, /Actions/);
});
