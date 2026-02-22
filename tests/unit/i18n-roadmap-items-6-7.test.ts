import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import en from "@/messages/en.json";
import uk from "@/messages/uk.json";

test("event form weekday labels are localized with parity", () => {
  const keys = [
    "weekdayMon",
    "weekdayTue",
    "weekdayWed",
    "weekdayThu",
    "weekdayFri",
    "weekdaySat",
    "weekdaySun"
  ] as const;

  for (const key of keys) {
    assert.ok(en.eventForm[key]);
    assert.ok(uk.eventForm[key]);
  }
});

test("groups delete confirmation and onboarding copy use translation keys", () => {
  const groupsView = fs.readFileSync(path.join(process.cwd(), "components/groups/GroupsView.tsx"), "utf8");
  assert.match(groupsView, /groups\.deleteDialogTitle/);
  assert.match(groupsView, /groups\.deleteDialogQuestion/);
  assert.match(groupsView, /groups\.deleteDialogDetails/);

  const accessPage = fs.readFileSync(path.join(process.cwd(), "app/[locale]/(gate)/access/page.tsx"), "utf8");
  assert.match(accessPage, /accessPage\.title/);
  assert.match(accessPage, /accessPage\.none\.joinCta/);

  const accessGate = fs.readFileSync(path.join(process.cwd(), "components/access/AccessGateContent.tsx"), "utf8");
  assert.match(accessGate, /accessGate\.pending\.whatNext/);
  assert.match(accessGate, /accessGate\.none\.whatNext/);
});
