import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  IOS_SAFE_GIVING_STRATEGIES,
  getIosSafeGivingStrategy,
  isGivingShortcutAllowed,
  isIosNativeShellMode
} from "@/lib/giving/iosSafeGiving";

const ORIGINAL_ENV = {
  NEXT_PUBLIC_IOS_NATIVE_SHELL: process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL,
  NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY: process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY
};

afterEach(() => {
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = ORIGINAL_ENV.NEXT_PUBLIC_IOS_NATIVE_SHELL;
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = ORIGINAL_ENV.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY;
});

test("giving shortcut remains allowed by default", () => {
  delete process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL;
  delete process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY;

  assert.equal(isIosNativeShellMode(), false);
  assert.equal(getIosSafeGivingStrategy(), "allow");
  assert.equal(isGivingShortcutAllowed(), true);
});

test("hide_in_ios_native strategy keeps web behavior unchanged", () => {
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = "false";
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = "hide_in_ios_native";

  assert.equal(isIosNativeShellMode(), false);
  assert.equal(isGivingShortcutAllowed(), true);
});

test("hide_in_ios_native strategy suppresses giving in iOS native shell", () => {
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = "true";
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = "hide_in_ios_native";

  assert.equal(isIosNativeShellMode(), true);
  assert.equal(isGivingShortcutAllowed(), false);
});

test("explicit allow strategy keeps giving enabled in iOS native shell", () => {
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = "true";
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = "allow";

  assert.equal(isGivingShortcutAllowed(), true);
});


test("strategy parsing is case-insensitive and trims whitespace", () => {
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = " TRUE ";
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = " HIDE_IN_IOS_NATIVE ";

  assert.equal(isIosNativeShellMode(), true);
  assert.equal(getIosSafeGivingStrategy(), IOS_SAFE_GIVING_STRATEGIES.HIDE_IN_IOS_NATIVE);
  assert.equal(isGivingShortcutAllowed(), false);
});

test("unknown strategy defaults to allow", () => {
  process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL = "true";
  process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY = "invalid";

  assert.equal(getIosSafeGivingStrategy(), IOS_SAFE_GIVING_STRATEGIES.ALLOW);
  assert.equal(isGivingShortcutAllowed(), true);
});
