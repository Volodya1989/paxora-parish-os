import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TaskRow from "@/components/tasks/TaskRow";
import type { TaskListItem } from "@/lib/queries/tasks";

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
  approvalStatus: "APPROVED",
  dueAt: "2026-01-21T00:00:00.000Z",
  completedAt: null,
  inProgressAt: null,
  completedBy: null,
  owner: {
    id: "user-1",
    name: "Alex Kim",
    initials: "AK"
  },
  group: {
    id: "group-1",
    name: "Liturgy"
  },
  canManage: true,
  canDelete: true,
  canStartWork: true,
  canManageStatus: true,
  canAssignToSelf: false,
  canAssignOthers: false,
  createdByRole: "MEMBER"
};

function findButtonByText(element: ReactElement, text: string): ReactElement | null {
  if (
    (element.type === "button" ||
      typeof element.type === "function" ||
      typeof element.type === "object") &&
    element.props?.children === text
  ) {
    return element;
  }

  const children = element.props?.children;
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== "object") {
      continue;
    }
    const found = findButtonByText(child as ReactElement, text);
    if (found) {
      return found;
    }
  }

  return null;
}

test("TaskRow renders key elements", () => {
  const markup = renderToStaticMarkup(
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
  );

  assert.match(markup, /Prepare worship guide/);
  assert.match(markup, />Open</);
  assert.match(markup, /aria-label="Task actions"/);
});

test("TaskRow start button calls handler", () => {
  let called = false;

  const element = TaskRow({
    task: baseTask,
    onStartWork: () => {
      called = true;
    },
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
  }) as ReactElement;

  const startButton = findButtonByText(element, "Start serving");
  assert.ok(startButton, "Expected start serving button to be rendered");
  startButton?.props.onClick?.();

  assert.equal(called, true);
});
