import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { loadModuleFromRoot } from "../_helpers/load-module";

let currentSession: { user: { id: string; activeParishId: string | null } } | null = null;

const state = {
  parishMembership: null as { role: "ADMIN" | "SHEPHERD" | "MEMBER" } | null,
  channel: null as { id: string; groupId: string | null; type: "GROUP" | "PARISH" | "ANNOUNCEMENT" } | null,
  groupMembership: null as { status: "ACTIVE" | "PENDING" } | null,
  membershipCount: 0,
  channelMembership: null as { id: string } | null,
  fetchStatus: 200
};

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => currentSession
  }
});

mock.module("../../lib/storage/r2", {
  namedExports: {
    signR2GetUrl: () => "https://r2.test/signed-get"
  }
});

mock.module("../../server/db/groups", {
  namedExports: {
    getParishMembership: async () => state.parishMembership,
    getGroupMembership: async () => state.groupMembership
  }
});

mock.module("../../lib/permissions", {
  namedExports: {
    isParishLeader: (role: string) => role === "ADMIN" || role === "SHEPHERD"
  }
});

mock.module("../../server/db/prisma", {
  namedExports: {
    prisma: {
      chatChannel: {
        findFirst: async () => state.channel
      },
      chatChannelMembership: {
        count: async () => state.membershipCount,
        findUnique: async () => state.channelMembership
      }
    }
  }
});

let imageRoute: any;

before(async () => {
  imageRoute = await loadModuleFromRoot("app/api/chat/images/[...key]/route");
  mock.method(global, "fetch", async () => new Response("img-bytes", { status: state.fetchStatus }));
});

after(() => {
  mock.restoreAll();
});

function resetState() {
  currentSession = null;
  state.parishMembership = null;
  state.channel = null;
  state.groupMembership = null;
  state.membershipCount = 0;
  state.channelMembership = null;
  state.fetchStatus = 200;
}

test("rejects unauthenticated image proxy access", async () => {
  resetState();

  const response = await imageRoute.GET(new Request("http://localhost"), {
    params: Promise.resolve({ key: ["chat", "channel-1", "photo.jpg"] })
  });

  assert.equal(response.status, 401);
});

test("returns 404 when authenticated user is not authorized for restricted channel", async () => {
  resetState();
  currentSession = {
    user: {
      id: "user-denied",
      activeParishId: "parish-1"
    }
  };
  state.parishMembership = { role: "MEMBER" };
  state.channel = { id: "channel-1", groupId: null, type: "PARISH" };
  state.membershipCount = 1;
  state.channelMembership = null;

  const response = await imageRoute.GET(new Request("http://localhost"), {
    params: Promise.resolve({ key: ["chat", "channel-1", "photo.jpg"] })
  });

  assert.equal(response.status, 404);
});

test("allows authorized member to fetch proxied chat image", async () => {
  resetState();
  currentSession = {
    user: {
      id: "user-1",
      activeParishId: "parish-1"
    }
  };
  state.parishMembership = { role: "MEMBER" };
  state.channel = { id: "channel-1", groupId: null, type: "PARISH" };
  state.membershipCount = 1;
  state.channelMembership = { id: "membership-1" };

  const response = await imageRoute.GET(new Request("http://localhost"), {
    params: Promise.resolve({ key: ["chat", "channel-1", "welcome.png"] })
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(await response.text(), "img-bytes");
});
