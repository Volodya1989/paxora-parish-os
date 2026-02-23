import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("getAccessGateState checks for pending AccessRequest records", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "lib/queries/access.ts"),
    "utf8"
  );

  // Verify that the function queries AccessRequest with PENDING status
  assert.match(
    source,
    /accessRequest\.findFirst/,
    "Should query for pending AccessRequest records"
  );
  assert.match(
    source,
    /status:\s*"PENDING"/,
    "Should filter by PENDING status"
  );
  assert.match(
    source,
    /status:\s*"pending"/,
    "Should return 'pending' as the gate state when a pending request exists"
  );
});

test("AccessGateContent handles pending status from getAccessGateState", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components/access/AccessGateContent.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /accessGate\.pending/,
    "AccessGateContent should reference accessGate.pending translation keys"
  );
});

test("access page handles pending status", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "app/[locale]/(gate)/access/page.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /accessPage\.pending/,
    "Access page should reference accessPage.pending translation keys"
  );
});

test("getAccessGateState checks for rejected AccessRequest records", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "lib/queries/access.ts"),
    "utf8"
  );

  assert.match(
    source,
    /status:\s*"REJECTED"/,
    "Should filter by REJECTED status"
  );
  assert.match(
    source,
    /status:\s*"rejected"/,
    "Should return 'rejected' as the gate state when a rejected request exists"
  );
});

test("AccessGateStatus type includes 'rejected'", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "lib/queries/access.ts"),
    "utf8"
  );

  assert.match(
    source,
    /AccessGateStatus\s*=.*"rejected"/,
    "AccessGateStatus type must include 'rejected'"
  );
});

test("AccessGateContent handles rejected status with i18n keys", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components/access/AccessGateContent.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /accessGate\.rejected/,
    "AccessGateContent should reference accessGate.rejected translation keys"
  );
});

test("en.json and uk.json have accessGate.rejected keys", () => {
  const en = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "messages/en.json"), "utf8")
  );
  const uk = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "messages/uk.json"), "utf8")
  );

  assert.ok(en.accessGate?.rejected?.title, "en.json must have accessGate.rejected.title");
  assert.ok(en.accessGate?.rejected?.nextAction, "en.json must have accessGate.rejected.nextAction");
  assert.ok(en.accessGate?.rejected?.whatNext, "en.json must have accessGate.rejected.whatNext");
  assert.ok(uk.accessGate?.rejected?.title, "uk.json must have accessGate.rejected.title");
  assert.ok(uk.accessGate?.rejected?.nextAction, "uk.json must have accessGate.rejected.nextAction");
  assert.ok(uk.accessGate?.rejected?.whatNext, "uk.json must have accessGate.rejected.whatNext");
});
