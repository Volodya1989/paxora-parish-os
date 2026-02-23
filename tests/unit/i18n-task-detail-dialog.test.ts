import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Risk 3 — TaskDetailDialog i18n sweep", () => {
  const componentPath = path.join(process.cwd(), "components/tasks/TaskDetailDialog.tsx");
  const enPath = path.join(process.cwd(), "messages/en.json");
  const ukPath = path.join(process.cwd(), "messages/uk.json");

  test("TaskDetailDialog has no remaining hardcoded English strings in UI output", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    // These strings were all hardcoded before the fix — now they should be gone
    const forbidden = [
      '"Unable to load details"',
      '"Update failed"',
      '"Comment added"',
      '"Mention target no longer exists"',
      '"Task ID copied"',
      '"Unable to copy Task ID"',
      '"Moved to in progress"',
      '"Marked complete"',
      '"Reopened task"',
      '"Assigned to you"',
      '"Left volunteer list"',
      '"Added to volunteers"',
      '"Volunteer removed"',
      '>Leave<',
      '>Volunteer<',
      '>Closed<',
      '>Remove<',
      '>Mention<',
      'Lead:{" "}',
      'Due date:{" "}',
      '>Unassigned<',
      '>Refreshing details',
    ];

    for (const str of forbidden) {
      assert.ok(
        !source.includes(str),
        `TaskDetailDialog should not contain hardcoded string: ${str}`
      );
    }
  });

  test("TaskDetailDialog uses useTranslations and references new taskDetail keys", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    assert.match(source, /useTranslations/, "Must use useTranslations hook");

    const expectedKeys = [
      "taskDetail.leadLabel",
      "taskDetail.unassigned",
      "taskDetail.dueDateLabel",
      "taskDetail.dueDateTbd",
      "taskDetail.leaveVolunteer",
      "taskDetail.volunteerAction",
      "taskDetail.volunteerClosed",
      "taskDetail.removeVolunteer",
      "taskDetail.mentionLabel",
      "taskDetail.refreshing",
      "taskDetail.toasts.loadFailed",
      "taskDetail.toasts.updateFailed",
      "taskDetail.toasts.commentAdded",
      "taskDetail.toasts.idCopied",
      "taskDetail.toasts.movedToInProgress",
      "taskDetail.toasts.markedComplete",
      "taskDetail.toasts.assignedToYou",
    ];

    for (const key of expectedKeys) {
      assert.ok(
        source.includes(`"${key}"`),
        `TaskDetailDialog should reference key: ${key}`
      );
    }
  });

  test("en.json has all new taskDetail keys", () => {
    const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const td = en.taskDetail;

    assert.ok(td.leadLabel, "en.json taskDetail.leadLabel");
    assert.ok(td.unassigned, "en.json taskDetail.unassigned");
    assert.ok(td.dueDateLabel, "en.json taskDetail.dueDateLabel");
    assert.ok(td.dueDateTbd, "en.json taskDetail.dueDateTbd");
    assert.ok(td.leaveVolunteer, "en.json taskDetail.leaveVolunteer");
    assert.ok(td.volunteerAction, "en.json taskDetail.volunteerAction");
    assert.ok(td.volunteerClosed, "en.json taskDetail.volunteerClosed");
    assert.ok(td.removeVolunteer, "en.json taskDetail.removeVolunteer");
    assert.ok(td.mentionLabel, "en.json taskDetail.mentionLabel");
    assert.ok(td.refreshing, "en.json taskDetail.refreshing");
    assert.ok(td.toasts?.loadFailed, "en.json taskDetail.toasts.loadFailed");
    assert.ok(td.toasts?.updateFailed, "en.json taskDetail.toasts.updateFailed");
    assert.ok(td.toasts?.commentAdded, "en.json taskDetail.toasts.commentAdded");
    assert.ok(td.toasts?.mentionTargetMissing, "en.json taskDetail.toasts.mentionTargetMissing");
    assert.ok(td.toasts?.idCopied, "en.json taskDetail.toasts.idCopied");
    assert.ok(td.toasts?.idCopyFailed, "en.json taskDetail.toasts.idCopyFailed");
    assert.ok(td.toasts?.movedToInProgress, "en.json taskDetail.toasts.movedToInProgress");
    assert.ok(td.toasts?.markedComplete, "en.json taskDetail.toasts.markedComplete");
    assert.ok(td.toasts?.reopenedTask, "en.json taskDetail.toasts.reopenedTask");
    assert.ok(td.toasts?.assignedToYou, "en.json taskDetail.toasts.assignedToYou");
    assert.ok(td.toasts?.leftVolunteerList, "en.json taskDetail.toasts.leftVolunteerList");
    assert.ok(td.toasts?.addedToVolunteers, "en.json taskDetail.toasts.addedToVolunteers");
    assert.ok(td.toasts?.volunteerRemoved, "en.json taskDetail.toasts.volunteerRemoved");
  });

  test("uk.json has all new taskDetail keys with parity", () => {
    const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const uk = JSON.parse(fs.readFileSync(ukPath, "utf8"));

    // Check that every new en key has a uk counterpart
    const enKeys = Object.keys(en.taskDetail.toasts ?? {});
    const ukKeys = Object.keys(uk.taskDetail.toasts ?? {});
    assert.deepStrictEqual(
      enKeys.sort(),
      ukKeys.sort(),
      "taskDetail.toasts keys must match between en.json and uk.json"
    );

    // Check flat keys
    const enFlat = Object.keys(en.taskDetail).filter((k) => typeof en.taskDetail[k] === "string");
    const ukFlat = Object.keys(uk.taskDetail).filter((k) => typeof uk.taskDetail[k] === "string");
    assert.deepStrictEqual(
      enFlat.sort(),
      ukFlat.sort(),
      "taskDetail flat string keys must match between en.json and uk.json"
    );
  });
});
