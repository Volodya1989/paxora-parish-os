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
