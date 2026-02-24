import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("people page wires q param and search UI", async () => {
  const pageSource = await readFile("app/[locale]/(app)/admin/people/page.tsx", "utf8");
  const viewSource = await readFile("components/admin/people/PeopleView.tsx", "utf8");

  assert.match(pageSource, /initialSearchQuery/);
  assert.match(pageSource, /getPeopleListForAdmin\(session\.user\.id, session\.user\.activeParishId, initialSearchQuery\)/);

  assert.match(viewSource, /placeholder="Search by name or email\.\.\."|placeholder="Search by name or email…"/);
  assert.match(viewSource, /aria-label="Clear search"/);
  assert.match(viewSource, /No members found\./);
});
