import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileSettings from "@/components/profile/ProfileSettings";
import { ToastProvider } from "@/components/ui/Toast";

test("ProfileCard renders name, email, and parish role", () => {
  const markup = renderToStaticMarkup(
    createElement(ProfileCard, {
      name: "Jordan Lee",
      email: "jordan@example.com",
      role: "ADMIN"
    })
  );

  assert.match(markup, /Jordan Lee/);
  assert.match(markup, /jordan@example.com/);
  assert.match(markup, /Admin/);
});

test("ProfileSettings renders toggles with aria-checked state", () => {
  const markup = renderToStaticMarkup(
    createElement(
      ToastProvider,
      null,
      createElement(ProfileSettings, {
        initialSettings: {
          notificationsEnabled: true,
          weeklyDigestEnabled: false,
          volunteerHoursOptIn: true
        }
      })
    )
  );

  assert.match(markup, /role="switch"/);
  assert.match(markup, /aria-checked="true"/);
  assert.match(markup, /aria-checked="false"/);
});
