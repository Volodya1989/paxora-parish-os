import { test } from "node:test";
import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { getMessages } from "@/lib/i18n/messages";
import Composer from "@/components/chat/Composer";

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider locale="en" messages={getMessages("en")}>{children}</I18nProvider>
);

test("Composer disables input when channel is locked", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Wrapper,
      null,
      createElement(Composer, { disabled: true, onSend: () => undefined })
    )
  );

  assert.ok(markup.includes("disabled"));
});
