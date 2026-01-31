import { after, before, beforeEach, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { applyMigrations } from "../_helpers/migrate";
import { loadModuleFromRoot } from "../_helpers/load-module";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test.skip : test.skip;

const session = {
  user: {
    id: "",
    activeParishId: ""
  }
};

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => session
  }
});

mock.module("next/cache", {
  namedExports: {
    revalidatePath: () => undefined
  }
});

async function resetDatabase() {
  await prisma.parishHubItem.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let hubItemsRoute: typeof import("@/app/api/parish/[parishId]/hub-items/route");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  hubItemsRoute = await loadModuleFromRoot("app/api/parish/[parishId]/hub-items/route");
  await prisma.$connect();
  await resetDatabase();
});

beforeEach(async () => {
  if (!hasDatabase) {
    return;
  }
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) {
    return;
  }
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("public hub items endpoint returns only public tiles", async () => {
  const parish = await prisma.parish.create({
    data: {
      name: "St. Mark",
      slug: "st-mark",
      hubGridEnabled: true,
      hubGridPublicEnabled: true
    }
  });

  await prisma.parishHubItem.create({
    data: {
      parishId: parish.id,
      label: "Public Tile",
      icon: "WEBSITE",
      targetType: "EXTERNAL",
      targetUrl: "https://example.com",
      visibility: "PUBLIC",
      order: 1,
      enabled: true
    }
  });

  await prisma.parishHubItem.create({
    data: {
      parishId: parish.id,
      label: "Member Tile",
      icon: "CALENDAR",
      targetType: "INTERNAL",
      internalRoute: "/calendar",
      visibility: "LOGGED_IN",
      order: 2,
      enabled: true
    }
  });

  session.user.id = "";
  session.user.activeParishId = "";

  const response = await hubItemsRoute.GET(
    new Request(`http://localhost/api/parish/${parish.id}/hub-items`),
    { params: Promise.resolve({ parishId: parish.id }) }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].visibility, "PUBLIC");
});

dbTest("member hub items endpoint returns public and logged-in tiles", async () => {
  const parish = await prisma.parish.create({
    data: {
      name: "St. Luke",
      slug: "st-luke",
      hubGridEnabled: true,
      hubGridPublicEnabled: false
    }
  });
  const user = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "MEMBER"
    }
  });

  await prisma.parishHubItem.create({
    data: {
      parishId: parish.id,
      label: "Public Tile",
      icon: "WEBSITE",
      targetType: "EXTERNAL",
      targetUrl: "https://example.com",
      visibility: "PUBLIC",
      order: 1,
      enabled: true
    }
  });

  await prisma.parishHubItem.create({
    data: {
      parishId: parish.id,
      label: "Member Tile",
      icon: "CALENDAR",
      targetType: "INTERNAL",
      internalRoute: "/calendar",
      visibility: "LOGGED_IN",
      order: 2,
      enabled: true
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const response = await hubItemsRoute.GET(
    new Request(`http://localhost/api/parish/${parish.id}/hub-items`),
    { params: Promise.resolve({ parishId: parish.id }) }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items.length, 2);
  const visibilities = body.items.map((item: { visibility: string }) => item.visibility);
  assert.deepEqual(visibilities, ["PUBLIC", "LOGGED_IN"]);
});

dbTest("admin can create hub item via POST", async () => {
  const parish = await prisma.parish.create({
    data: {
      name: "St. Anne",
      slug: "st-anne",
      hubGridEnabled: true,
      hubGridPublicEnabled: false
    }
  });
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "ADMIN"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const response = await hubItemsRoute.POST(
    new Request(`http://localhost/api/parish/${parish.id}/hub-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: "Giving",
        icon: "GIVING",
        targetType: "EXTERNAL",
        targetUrl: "https://give.example.com",
        visibility: "PUBLIC",
        enabled: true
      })
    }),
    { params: Promise.resolve({ parishId: parish.id }) }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.item.label, "Giving");

  const stored = await prisma.parishHubItem.findUnique({
    where: { id: body.item.id },
    select: { id: true, label: true }
  });

  assert.ok(stored);
  assert.equal(stored?.label, "Giving");
});
