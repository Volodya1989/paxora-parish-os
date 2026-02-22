import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import en from "@/messages/en.json";
import uk from "@/messages/uk.json";

test("eventCreateDialog keys exist with EN/UK parity", () => {
  const keys = [
    "title",
    "description",
    "successTitle",
    "successDescription",
    "submitLabel"
  ] as const;

  for (const key of keys) {
    assert.ok(en.eventCreateDialog[key], `Missing en.eventCreateDialog.${key}`);
    assert.ok(uk.eventCreateDialog[key], `Missing uk.eventCreateDialog.${key}`);
  }
});

test("eventEditForm keys exist with EN/UK parity", () => {
  const keys = [
    "successTitle",
    "successDescription",
    "submitLabel"
  ] as const;

  for (const key of keys) {
    assert.ok(en.eventEditForm[key], `Missing en.eventEditForm.${key}`);
    assert.ok(uk.eventEditForm[key], `Missing uk.eventEditForm.${key}`);
  }
});

test("taskEdit keys exist with EN/UK parity", () => {
  const keys = [
    "dialogTitle",
    "dialogDescription",
    "toastUpdatedTitle",
    "toastUpdatedDescription",
    "title",
    "titlePlaceholder",
    "notesOptional",
    "notesPlaceholder",
    "estimatedHours",
    "estimatedHoursPlaceholder",
    "dueDate",
    "privateHint",
    "visibility",
    "visibilityPublic",
    "visibilityPrivate",
    "visibilityPublicHint",
    "volunteersNeeded",
    "volunteersHint",
    "group",
    "noGroup",
    "leadOptional",
    "assigneeOptional",
    "youSuffix",
    "saveChanges"
  ] as const;

  for (const key of keys) {
    assert.ok(en.taskEdit[key], `Missing en.taskEdit.${key}`);
    assert.ok(uk.taskEdit[key], `Missing uk.taskEdit.${key}`);
  }
});

test("taskCompletion keys exist with EN/UK parity", () => {
  const keys = [
    "dialogTitle",
    "logHoursTitle",
    "logHoursDescription",
    "howToLog",
    "useEstimated",
    "enterActual",
    "skipLogging",
    "estimatedInfo",
    "noEstimate",
    "hoursPerParticipant",
    "hoursPlaceholder",
    "skipInfo",
    "completeTask"
  ] as const;

  for (const key of keys) {
    assert.ok(en.taskCompletion[key], `Missing en.taskCompletion.${key}`);
    assert.ok(uk.taskCompletion[key], `Missing uk.taskCompletion.${key}`);
  }
});

test("groupEdit keys exist with EN/UK parity", () => {
  const keys = [
    "dialogTitle",
    "dialogDescription",
    "toastUpdatedTitle",
    "toastUpdatedDescription",
    "errorGeneric",
    "toastErrorTitle",
    "toastErrorDescription",
    "photoLabel",
    "groupName",
    "groupNamePlaceholder",
    "descriptionOptional",
    "descriptionPlaceholder",
    "visibility",
    "joinSettings",
    "publicDesc",
    "privateDesc",
    "inviteOnly",
    "openJoin",
    "requestToJoin",
    "nameRequired",
    "nameTooLong",
    "descriptionTooLong",
    "saveChanges"
  ] as const;

  for (const key of keys) {
    assert.ok(en.groupEdit[key], `Missing en.groupEdit.${key}`);
    assert.ok(uk.groupEdit[key], `Missing uk.groupEdit.${key}`);
  }
});

test("edit dialog components reference translation keys", () => {
  const eventCreate = fs.readFileSync(
    path.join(process.cwd(), "components/calendar/EventCreateDialog.tsx"),
    "utf8"
  );
  assert.match(eventCreate, /eventCreateDialog\.title/);
  assert.match(eventCreate, /eventCreateDialog\.submitLabel/);
  assert.match(eventCreate, /useTranslations/);

  const eventEdit = fs.readFileSync(
    path.join(process.cwd(), "components/calendar/EventEditForm.tsx"),
    "utf8"
  );
  assert.match(eventEdit, /eventEditForm\.successTitle/);
  assert.match(eventEdit, /useTranslations/);

  const taskEdit = fs.readFileSync(
    path.join(process.cwd(), "components/tasks/TaskEditDialog.tsx"),
    "utf8"
  );
  assert.match(taskEdit, /taskEdit\.dialogTitle/);
  assert.match(taskEdit, /taskEdit\.saveChanges/);
  assert.match(taskEdit, /useTranslations/);

  const taskCompletion = fs.readFileSync(
    path.join(process.cwd(), "components/tasks/TaskCompletionDialog.tsx"),
    "utf8"
  );
  assert.match(taskCompletion, /taskCompletion\.dialogTitle/);
  assert.match(taskCompletion, /taskCompletion\.completeTask/);
  assert.match(taskCompletion, /useTranslations/);

  const groupEdit = fs.readFileSync(
    path.join(process.cwd(), "components/groups/GroupEditDialog.tsx"),
    "utf8"
  );
  assert.match(groupEdit, /groupEdit\.dialogTitle/);
  assert.match(groupEdit, /groupEdit\.saveChanges/);
  assert.match(groupEdit, /useTranslations/);
});
