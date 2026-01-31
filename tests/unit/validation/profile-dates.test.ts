import { test } from "node:test";
import assert from "node:assert/strict";
import { profileDatesSchema } from "@/lib/validation/profile";

test("profileDatesSchema allows Feb 29", () => {
  const result = profileDatesSchema.safeParse({
    birthdayMonth: 2,
    birthdayDay: 29,
    anniversaryMonth: null,
    anniversaryDay: null,
    greetingsOptIn: false
  });

  assert.equal(result.success, true);
});

test("profileDatesSchema rejects missing day when month is set", () => {
  const result = profileDatesSchema.safeParse({
    birthdayMonth: 3,
    birthdayDay: null,
    anniversaryMonth: null,
    anniversaryDay: null,
    greetingsOptIn: false
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "birthdayDay"));
});

test("profileDatesSchema rejects missing month when day is set", () => {
  const result = profileDatesSchema.safeParse({
    birthdayMonth: null,
    birthdayDay: 12,
    anniversaryMonth: null,
    anniversaryDay: null,
    greetingsOptIn: false
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "birthdayMonth"));
});

test("profileDatesSchema rejects invalid day for month", () => {
  const result = profileDatesSchema.safeParse({
    birthdayMonth: 4,
    birthdayDay: 31,
    anniversaryMonth: null,
    anniversaryDay: null,
    greetingsOptIn: false
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === "birthdayDay"));
});
