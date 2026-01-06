import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

const mockModule = mock.module.bind(mock) as (
  specifier: string,
  options: { namedExports?: Record<string, unknown> }
) => void;

let session = {
  user: {
    id: "user-1",
    activeParishId: "parish-1"
  }
};

let existingDigest: { status: "DRAFT" | "PUBLISHED" } | null = null;
let upsertInput: any;
let publishInput: any;

mockModule("next-auth", {
  namedExports: {
    getServerSession: async () => session
  }
});

mockModule("next/cache", {
  namedExports: {
    revalidatePath: () => {}
  }
});

mockModule("@/server/db/groups", {
  namedExports: {
    getParishMembership: async () => ({ id: "membership-1", role: "ADMIN" })
  }
});

mockModule("@/domain/week", {
  namedExports: {
    getOrCreateCurrentWeek: async () => ({ id: "week-1" })
  }
});

mockModule("@/server/db/digest", {
  namedExports: {
    getWeekDigest: async () => existingDigest,
    upsertDigestDraft: async (input: any) => {
      upsertInput = input;
      return { id: "digest-1", content: input.content, status: "DRAFT", publishedAt: null };
    },
    publishDigestRecord: async (input: any) => {
      publishInput = input;
      return {
        id: "digest-1",
        content: input.content,
        status: "PUBLISHED",
        publishedAt: new Date("2024-09-06T00:00:00.000Z")
      };
    }
  }
});

afterEach(() => {
  existingDigest = null;
  upsertInput = undefined;
  publishInput = undefined;
});

test("saveDigestDraft stores draft content for the current week", async () => {
  const { saveDigestDraft } = await import("@/server/actions/digest");
  const result = await saveDigestDraft("Draft content");

  assert.equal(result.status, "draft");
  assert.equal(result.content, "Draft content");
  assert.deepEqual(upsertInput, {
    parishId: "parish-1",
    weekId: "week-1",
    userId: "user-1",
    content: "Draft content"
  });
});

test("saveDigestDraft rejects publishing regression", async () => {
  const { saveDigestDraft } = await import("@/server/actions/digest");
  existingDigest = { status: "PUBLISHED" };

  await assert.rejects(() => saveDigestDraft("Draft content"), /Cannot revert a published digest/);
});

test("publishDigest publishes content for the current week", async () => {
  const { publishDigest } = await import("@/server/actions/digest");
  existingDigest = { status: "DRAFT" };

  const result = await publishDigest("Final content");

  assert.equal(result.status, "published");
  assert.equal(result.content, "Final content");
  assert.deepEqual(publishInput, {
    parishId: "parish-1",
    weekId: "week-1",
    userId: "user-1",
    content: "Final content"
  });
});
