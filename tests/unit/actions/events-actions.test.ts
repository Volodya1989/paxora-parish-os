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

const prisma = {
  membership: {
    findUnique: async () => null
  },
  event: {
    create: async () => ({})
  }
};

mockModule("@/server/db/prisma", {
  namedExports: {
    prisma
  }
});

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

afterEach(() => {
  mock.restoreAll();
});

test("listWeekEvents rejects non-members", async () => {
  const { listWeekEvents } = await import("@/server/actions/events");
  prisma.membership.findUnique = async () => null;

  await assert.rejects(() => listWeekEvents(), /Unauthorized/);
});

test("createEvent is restricted to parish leaders", async () => {
  const { createEvent } = await import("@/server/actions/events");
  prisma.membership.findUnique = async () => ({ role: "MEMBER" } as any);
  prisma.event.create = async () => ({} as any);

  const formData = new FormData();
  formData.set("title", "Sunday Mass");
  formData.set("weekId", "week-1");
  formData.set("startsAt", "2024-09-08T09:00:00.000Z");
  formData.set("endsAt", "2024-09-08T10:00:00.000Z");
  formData.set("location", "");

  await assert.rejects(() => createEvent(formData), /Forbidden/);
});
