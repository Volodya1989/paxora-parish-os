import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Risk 1 — ChatChannel unique index on (parishId, groupId, type)", () => {
  const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
  const groupsActionPath = path.join(process.cwd(), "server/actions/groups.ts");

  test("Prisma schema declares @@unique on ChatChannel (parishId, groupId, type)", () => {
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Extract the ChatChannel model block
    const modelMatch = schema.match(/model ChatChannel \{[\s\S]*?\n\}/);
    assert.ok(modelMatch, "ChatChannel model must exist in schema");

    const modelBlock = modelMatch[0];
    assert.match(
      modelBlock,
      /@@unique\(\[parishId,\s*groupId,\s*type\]/,
      "ChatChannel must have @@unique([parishId, groupId, type])"
    );
  });

  test("ensureGroupChatChannel uses atomic upsert instead of findFirst+create", () => {
    const source = fs.readFileSync(groupsActionPath, "utf8");

    // Extract the ensureGroupChatChannel function body
    const fnMatch = source.match(/async function ensureGroupChatChannel[\s\S]*?\n\}/);
    assert.ok(fnMatch, "ensureGroupChatChannel function must exist");

    const fnBody = fnMatch[0];

    // Should use upsert
    assert.match(fnBody, /\.upsert\(/, "Must use upsert for atomic channel creation");

    // Should reference the named unique constraint
    assert.match(
      fnBody,
      /ChatChannel_parish_group_type/,
      "Must reference the named unique constraint"
    );

    // Should NOT use findFirst (old pattern)
    assert.ok(
      !fnBody.includes("findFirst"),
      "Should not use findFirst pattern (replaced by upsert)"
    );
  });
});
