import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RsvpButtons from "@/components/events/RsvpButtons";
import { ToastProvider } from "@/components/ui/Toast";
import { withI18n } from "@/tests/utils/i18n";

function renderWithToast(element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(withI18n(createElement(ToastProvider, null, element)));
}

test("RsvpButtons renders three responses", () => {
  const markup = renderWithToast(
    createElement(RsvpButtons, { eventId: "event-1", initialResponse: null })
  );

  assert.match(markup, /data-testid="rsvp-yes"/);
  assert.match(markup, /data-testid="rsvp-maybe"/);
  assert.match(markup, /data-testid="rsvp-no"/);
});

test("RsvpButtons reflects selected response", () => {
  const markup = renderWithToast(
    createElement(RsvpButtons, { eventId: "event-1", initialResponse: "MAYBE" })
  );

  assert.match(markup, /data-testid="rsvp-maybe"[^>]*aria-pressed="true"/);
  assert.match(markup, /data-testid="rsvp-yes"[^>]*aria-pressed="false"/);
});

test("RsvpButtons updates selected state when props change", () => {
  const initialMarkup = renderWithToast(
    createElement(RsvpButtons, { eventId: "event-1", initialResponse: "YES" })
  );
  const updatedMarkup = renderWithToast(
    createElement(RsvpButtons, { eventId: "event-1", initialResponse: "NO" })
  );

  assert.match(initialMarkup, /data-testid="rsvp-yes"[^>]*aria-pressed="true"/);
  assert.match(updatedMarkup, /data-testid="rsvp-no"[^>]*aria-pressed="true"/);
});
