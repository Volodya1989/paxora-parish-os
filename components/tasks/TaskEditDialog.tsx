"use client";

import { useActionState, useEffect, useId, useRef, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import Textarea from "@/components/ui/Textarea";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { updateTask } from "@/server/actions/tasks";
import {
  initialTaskActionState,
  type TaskActionState
} from "@/server/actions/taskState";
import type { TaskListItem } from "@/lib/queries/tasks";

type TaskEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskListItem | null;
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string }>;
  currentUserId: string;
};

export default function TaskEditDialog({
  open,
  onOpenChange,
  task,
  groupOptions,
  memberOptions,
  currentUserId
}: TaskEditDialogProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [state, formAction] = useActionState<TaskActionState, FormData>(
    updateTask,
    initialTaskActionState
  );
  const handledSuccess = useRef(false);
  const [, startTransition] = useTransition();
  const modalFormRef = useRef<HTMLFormElement>(null);
  const drawerFormRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const notesId = useId();
  const estimatedHoursId = useId();
  const visibilityId = useId();
  const groupId = useId();
  const ownerId = useId();

  useEffect(() => {
    if (state.status !== "success") {
      handledSuccess.current = false;
      return;
    }

    if (handledSuccess.current) {
      return;
    }

    handledSuccess.current = true;
    modalFormRef.current?.reset();
    drawerFormRef.current?.reset();
    addToast({
      title: "Task updated",
      description: "Your changes are saved."
    });
    onOpenChange(false);
    startTransition(() => {
      router.refresh();
    });
  }, [addToast, onOpenChange, router, startTransition, state.status]);

  const renderForm = (ref: RefObject<HTMLFormElement>) => (
    <form
      key={task?.id ?? "empty"}
      ref={ref}
      className="space-y-4"
      action={formAction}
    >
      <input type="hidden" name="taskId" value={task?.id ?? ""} />
      <div className="space-y-2">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          name="title"
          placeholder="Update the task title"
          defaultValue={task?.title ?? ""}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={notesId}>Notes (optional)</Label>
        <Textarea
          id={notesId}
          name="notes"
          placeholder="Update details, context, or links."
          rows={4}
          defaultValue={task?.notes ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={estimatedHoursId}>Estimated hours (optional)</Label>
        <Input
          id={estimatedHoursId}
          name="estimatedHours"
          type="number"
          min={0}
          step="0.25"
          placeholder="e.g. 2"
          defaultValue={task?.estimatedHours ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={visibilityId}>Visibility</Label>
        <SelectMenu
          id={visibilityId}
          name="visibility"
          defaultValue={task?.visibility === "PRIVATE" ? "private" : "public"}
          options={[
            { value: "public", label: "Public (shared with the parish)" },
            { value: "private", label: "Private (just you + assignee)" }
          ]}
        />
        <p className="text-xs text-ink-400">
          Public tasks created by members require approval before they appear for everyone.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={groupId}>Group</Label>
          <SelectMenu
            id={groupId}
            name="groupId"
            defaultValue={task?.group?.id ?? ""}
            placeholder="No group"
            options={[
              { value: "", label: "No group" },
              ...groupOptions.map((group) => ({ value: group.id, label: group.name }))
            ]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={ownerId}>Assignee</Label>
          <SelectMenu
            id={ownerId}
            name="ownerId"
            defaultValue={task?.owner.id ?? currentUserId}
            options={memberOptions.map((member) => ({
              value: member.id,
              label: `${member.name}${member.id === currentUserId ? " (You)" : ""}`
            }))}
          />
        </div>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-rose-600">
          {state.message}
        </p>
      ) : null}
      <TaskEditActions onCancel={() => onOpenChange(false)} />
    </form>
  );

  return (
    <>
      <Modal open={open} onClose={() => onOpenChange(false)} title="Edit task">
        <p className="mb-4 text-sm text-ink-500">
          Make quick updates so your team stays aligned.
        </p>
        {renderForm(modalFormRef)}
      </Modal>
      <Drawer open={open} onClose={() => onOpenChange(false)} title="Edit task">
        <p className="mb-4 text-sm text-ink-500">
          Make quick updates so your team stays aligned.
        </p>
        {renderForm(drawerFormRef)}
      </Drawer>
    </>
  );
}

function TaskEditActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" isLoading={pending}>
        Save changes
      </Button>
    </div>
  );
}
