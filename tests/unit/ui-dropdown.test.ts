import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  handleDropdownMenuKeyDown
} from "@/components/ui/Dropdown";

test("Dropdown renders aria attributes and roles when open", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dropdown,
      { open: true },
      createElement(
        DropdownTrigger,
        { iconOnly: true, "aria-label": "More options" },
        "⋯"
      ),
      createElement(
        DropdownMenu,
        { ariaLabel: "More menu" },
        createElement(DropdownItem, null, "Item")
      )
    )
  );

  assert.match(markup, /aria-haspopup=\"menu\"/);
  assert.match(markup, /aria-expanded=\"true\"/);
  assert.match(markup, /aria-label=\"More options\"/);
  assert.match(markup, /role=\"menu\"/);
  assert.match(markup, /role=\"menuitem\"/);
});

test("Dropdown closes on Escape", () => {
  let open = true;
  handleDropdownMenuKeyDown(
    { key: "Escape", preventDefault: () => undefined },
    {
      itemCount: 2,
      currentIndex: 0,
      onIndexChange: () => undefined,
      onOpenChange: (nextOpen) => {
        open = nextOpen;
      }
    }
  );

  assert.equal(open, false);
});

test("Dropdown respects closed state", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Dropdown,
      { open: false },
      createElement(DropdownTrigger, null, "Menu"),
      createElement(
        DropdownMenu,
        { ariaLabel: "Menu" },
        createElement(DropdownItem, null, "Item")
      )
    )
  );

  assert.doesNotMatch(markup, /role=\"menu\"/);
});
