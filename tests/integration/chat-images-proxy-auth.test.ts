import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

let currentSession: { user: { id: string; activeParishId: string | null } } | null = null;

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => currentSession
  }
});

mock.module("@/lib/storage/r2", {
  namedExports: {
    signR2GetUrl: () => "https://r2.test/signed-get"
  }
});

let imageRoute: any;

async function resetDatabase() {
  await prisma.chatMessageAttachment.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannelMembership.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) return;
  await applyMigrations();
  await prisma.$connect();
  await resetDatabase();
  imageRoute = await loadModuleFromRoot("app/api/chat/images/[...key]/route");
  mock.method(global, "fetch", async () => new Response("img-bytes", { status: 200 }));
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
  mock.restoreAll();
});

dbTest("rejects unauthenticated image proxy access", async () => {
  currentSession = null;

  const response = await imageRoute.GET(new Request("http://localhost"), {
    params: Promise.resolve({ key: ["chat", "channel-1", "photo.jpg"] })
  });

  assert.equal(response.status, 401);
});

dbTest("returns 404 when authenticated user is not authorized for restricted channel", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Auth", slug: "st-auth" } });
  const [allowedUser, deniedUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "allowed@images.test",
        passwordHash: "hash",
        activeParishId: parish.id
      }
    }),
    prisma.user.create({
      data: {
        email: "denied@images.test",
        passwordHash: "hash",
        activeParishId: parish.id
      }
    })
  ]);

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: allowedUser.id, role: "MEMBER" },
      { parishId: parish.id, userId: deniedUser.id, role: "MEMBER" }
    ]
  });

  const channel = await prisma.chatChannel.create({
    data: { parishId: parish.id, type: "PARISH", name: "Leads" }
  });

  await prisma.chatChannelMembership.create({
    data: {
      channelId: channel.id,
      userId: allowedUser.id
    }
  });

  currentSession = {
    user: {
      id: deniedUser.id,
      activeParishId: parish.id
    }
  };

  const response = await imageRoute.GET(new Request("http://localhost"), {
    params: Promise.resolve({ key: ["chat", channel.id, "photo.jpg"] })
  });

  assert.equal(response.status, 404);
});

dbTest("allows authorized member to fetch proxied chat image", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Allowed", slug: "st-allowed" }
  });
  const user = await prisma.user.create({
    data: {
      email: "member@images.test",
      passwordHash: "hash",
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

  const channel = await prisma.chatChannel.create({
    data: { parishId: parish.id, type: "PARISH", name: "General" }
  });

  await prisma.chatChannelMembership.create({
    data: {
      channelId: channel.id,
      userId: user.id
    }
  });

  currentSession = {
    user: {
      id: user.id,
      activeParishId: parish.id
    }
  };

  const response = await imageRoute.GET(new Request("http://localhost"), {
    params: Promise.resolve({ key: ["chat", channel.id, "welcome.png"] })
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(await response.text(), "img-bytes");
});
