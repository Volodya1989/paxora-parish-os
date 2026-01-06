import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { prisma } from "@/server/db/prisma";

const mockModule = (mock as unknown as { module: (specifier: string, factory: () => unknown) => void })
  .module;

let session = {
  user: {
    id: "user-1",
    activeParishId: "parish-1"
  }
};

mockModule("next-auth", () => ({
  getServerSession: async () => session
}));

mockModule("next/cache", () => ({
  revalidatePath: () => {}
}));

const { listWeekEvents, createEvent } = await import("@/server/actions/events");

afterEach(() => {
  mock.restoreAll();
});

test("listWeekEvents rejects non-members", async () => {
  mock.method(prisma.membership, "findUnique", async () => null);

  await assert.rejects(() => listWeekEvents(), /Unauthorized/);
});

test("createEvent is restricted to parish leaders", async () => {
  mock.method(prisma.membership, "findUnique", async () => ({ role: "MEMBER" } as any));
  mock.method(prisma.event, "create", async () => ({} as any));

  const formData = new FormData();
  formData.set("title", "Sunday Mass");
  formData.set("weekId", "week-1");
  formData.set("startsAt", "2024-09-08T09:00:00.000Z");
  formData.set("endsAt", "2024-09-08T10:00:00.000Z");

  await assert.rejects(() => createEvent(formData), /Forbidden/);
});
