import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TaskRow from "@/components/tasks/TaskRow";
import type { TaskListItem } from "@/lib/queries/tasks";
import { withI18n } from "@/tests/utils/i18n";

const baseTask: TaskListItem = {
  id: "task-1",
  title: "Prepare worship guide",
  notes: "Finalize readings and hymns.",
  estimatedHours: 3,
  volunteersNeeded: 1,
  volunteerCount: 0,
  hasVolunteered: false,
  status: "OPEN",
  visibility: "PUBLIC",
  openToVolunteers: true,
  approvalStatus: "APPROVED",
  dueAt: "2026-01-21T00:00:00.000Z",
  completedAt: null,
  inProgressAt: null,
  updatedAt: "2026-01-20T00:00:00.000Z",
  updatedBy: null,
  completedBy: null,
  owner: {
    id: "user-1",
    name: "Alex Kim",
    initials: "AK"
  },
  coordinator: null,
  group: {
    id: "group-1",
    name: "Liturgy"
  },
  createdById: "user-1",
  canManage: true,
  canDelete: true,
  canStartWork: true,
  canManageStatus: true,
  canAssignToSelf: false,
  canAssignOthers: false,
  canVolunteer: true,
  createdByRole: "MEMBER"
};

test("TaskRow renders key elements", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(TaskRow, {
        task: baseTask,
        onStartWork: () => undefined,
        onMarkDone: () => undefined,
        onMarkOpen: () => undefined,
        onAssignToMe: () => undefined,
        onUnassign: () => undefined,
        onVolunteer: () => undefined,
        onLeaveVolunteer: () => undefined,
        onViewDetails: () => undefined,
        onArchive: () => undefined,
        onEdit: () => undefined,
        onDelete: () => undefined,
        currentUserId: "user-1"
      })
    )
  );

  assert.match(markup, /Prepare worship guide/);
  assert.match(markup, />To Do</);
  assert.match(markup, /aria-label="Task actions"/);
});

test("TaskRow includes start serving action", () => {
  const markup = renderToStaticMarkup(
    withI18n(
      createElement(TaskRow, {
        task: baseTask,
        onStartWork: () => undefined,
        onMarkDone: () => undefined,
        onMarkOpen: () => undefined,
        onAssignToMe: () => undefined,
        onUnassign: () => undefined,
        onVolunteer: () => undefined,
        onLeaveVolunteer: () => undefined,
        onViewDetails: () => undefined,
        onArchive: () => undefined,
        onEdit: () => undefined,
        onDelete: () => undefined,
        currentUserId: "user-1"
      })
    )
  );

  assert.match(markup, /Start serving/);
});
