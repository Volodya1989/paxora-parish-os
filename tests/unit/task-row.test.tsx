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
  status: "OPEN",
  owner: {
    id: "user-1",
    name: "Alex Kim",
    initials: "AK"
  },
  group: {
    id: "group-1",
    name: "Liturgy"
  },
  canManage: true
};

function findElementByType(
  element: ReactElement,
  type: string
): ReactElement | null {
  if (element.type === type) {
    return element;
  }

  const children = element.props?.children;
  const childArray = Array.isArray(children) ? children : [children];

  for (const child of childArray) {
    if (!child || typeof child !== "object") {
      continue;
    }
    const found = findElementByType(child as ReactElement, type);
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
      onToggle: () => undefined,
      onArchive: () => undefined
    })
  );

  assert.match(markup, /Prepare worship guide/);
  assert.match(markup, />Open</);
  assert.match(markup, /aria-label="Task actions"/);
});

test("TaskRow toggle calls handler", () => {
  let called = false;

  const element = TaskRow({
    task: baseTask,
    onToggle: (_id, nextStatus) => {
      called = true;
      assert.equal(nextStatus, "DONE");
    },
    onArchive: () => undefined
  }) as ReactElement;

  const checkbox = findElementByType(element, "input");
  assert.ok(checkbox, "Expected checkbox input to be rendered");

  checkbox?.props.onChange?.();

  assert.equal(called, true);
});
