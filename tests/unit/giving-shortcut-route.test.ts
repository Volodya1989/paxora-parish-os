import { afterEach, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { resolveFromRoot } from "../_helpers/resolve";
import { loadModuleFromRoot } from "../_helpers/load-module";

type MockHubItem = {
  icon: string;
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl?: string;
  internalRoute?: string;
};

const listParishHubItemsForMember = mock.fn<() => Promise<MockHubItem[]>>(async () => []);

mock.module(resolveFromRoot("server/actions/parish-hub"), {
  namedExports: {
    listParishHubItemsForMember
  }
});

const ORIGINAL_ENV = {
  NEXT_PUBLIC_IOS_NATIVE_SHELL: process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL,
  NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY: process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY
};

let givingShortcutRoute: { GET: () => Promise<Response> };

before(async () => {
  givingShortcutRoute = await loadModuleFromRoot("app/api/parish/giving-shortcut/route");
});

afterEach(() => {
  listParishHubItemsForMember.mock.resetCalls();
  listParishHubItemsForMember.mock.mockImplementation(async () => []);
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = ORIGINAL_ENV.NEXT_PUBLIC_IOS_NATIVE_SHELL;
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = ORIGINAL_ENV.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY;
});

test("API returns null shortcut in iOS native hide mode", async () => {
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = "true";
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = "hide_in_ios_native";

  const response = await givingShortcutRoute.GET();
  const body = await response.json();

  assert.deepEqual(body, { shortcut: null });
  assert.equal(listParishHubItemsForMember.mock.callCount(), 0);
});

test("API returns external giving shortcut when allowed", async () => {
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = "false";
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = "hide_in_ios_native";
  listParishHubItemsForMember.mock.mockImplementation(async () => [
    {
      icon: "GIVING",
      targetType: "EXTERNAL",
      targetUrl: "https://give.example.com"
    }
  ]);

  const response = await givingShortcutRoute.GET();
  const body = await response.json();

  assert.deepEqual(body, {
    shortcut: {
      href: "https://give.example.com",
      targetType: "EXTERNAL"
    }
  });
  assert.equal(listParishHubItemsForMember.mock.callCount(), 1);
});
