"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition, type RefObject } from "react";
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
import { shouldCloseTaskDialog } from "@/components/tasks/taskDialogSuccess";
import { useTranslations } from "@/lib/i18n/provider";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type TaskEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskListItem | null;
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string; label?: string }>;
  currentUserId: string;
  forcePrivate?: boolean;
  hideEstimatedHours?: boolean;
};

export default function TaskEditDialog({
  open,
  onOpenChange,
  task,
  groupOptions,
  memberOptions,
  currentUserId,
  forcePrivate = false,
  hideEstimatedHours = false
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
  const volunteersId = useId();
  const dueAtId = useId();
  const visibilityId = useId();
  const groupId = useId();
  const ownerId = useId();
  const volunteersNeeded = task?.volunteersNeeded ?? 1;
  const [visibility, setVisibility] = useState<"public" | "private">(
    forcePrivate || task?.visibility === "PRIVATE" ? "private" : "public"
  );

  useEffect(() => {
    if (open) {
      handledSuccess.current = false;
      setVisibility(forcePrivate || task?.visibility === "PRIVATE" ? "private" : "public");
    }
  }, [forcePrivate, open, task?.visibility]);

  useEffect(() => {
    if (state.status !== "success") {
      handledSuccess.current = false;
      return;
    }

    if (!shouldCloseTaskDialog(state, handledSuccess.current)) {
      return;
    }

    handledSuccess.current = true;
    modalFormRef.current?.reset();
    drawerFormRef.current?.reset();
    addToast({
      title: "Task updated",
      description: "Your changes are saved.",
      status: "success"
    });
    onOpenChange(false);
    startTransition(() => {
      router.refresh();
    });
  }, [addToast, onOpenChange, router, startTransition, state]);

  const renderForm = (ref: RefObject<HTMLFormElement>) => (
    <form
      key={task?.id ?? "empty"}
      ref={ref}
      className="space-y-4"
      action={formAction}
    >
      <input type="hidden" name="taskId" value={task?.id ?? ""} />
      <input type="hidden" name="editContext" value={forcePrivate ? "my_commitments" : "default"} />
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
      {!hideEstimatedHours ? (
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
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={dueAtId}>Due date</Label>
        <Input
          id={dueAtId}
          name="dueAt"
          type="date"
          defaultValue={task?.dueAt ? formatDateInput(new Date(task.dueAt)) : ""}
        />
      </div>
      {forcePrivate ? (
        <>
          <input type="hidden" name="visibility" value="private" />
          <p className="rounded-xl border border-mist-200 bg-mist-50 px-3 py-2 text-xs text-ink-500">
            Private commitment only.
          </p>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={visibilityId}>Visibility</Label>
          <SelectMenu
            id={visibilityId}
            name="visibility"
            value={visibility}
            onValueChange={(nextValue) => {
              const nextVisibility = nextValue === "public" ? "public" : "private";
              setVisibility(nextVisibility);
            }}
            options={[
              { value: "public", label: "Public (shared with the parish)" },
              { value: "private", label: "Private (just you)" }
            ]}
          />
          <p className="text-xs text-ink-400">
            Public tasks created by members require approval before they appear for everyone.
          </p>
        </div>
      )}
      {visibility === "private" || forcePrivate ? (
        <>
          <input type="hidden" name="volunteersNeeded" value="1" />
          <input type="hidden" name="groupId" value="" />
          <input type="hidden" name="ownerId" value={task?.createdById ?? currentUserId} />
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor={volunteersId}>Volunteers needed</Label>
            <Input
              id={volunteersId}
              name="volunteersNeeded"
              type="number"
              min={1}
              step={1}
              defaultValue={volunteersNeeded}
            />
            <p className="text-xs text-ink-400">
              Set this above 1 to allow multiple volunteers to join.
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
              <Label htmlFor={ownerId}>
                {volunteersNeeded > 1 ? "Lead (optional)" : "Assignee (optional)"}
              </Label>
              <SelectMenu
                id={ownerId}
                name="ownerId"
                defaultValue={task?.owner?.id ?? ""}
                options={memberOptions.map((member) => ({
                  value: member.id,
                  label: `${member.name}${member.id === currentUserId ? " (You)" : ""}`
                }))}
              />
            </div>
          </div>
        </>
      )}

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
  const t = useTranslations();
  const { pending } = useFormStatus();

  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        {t("buttons.cancel")}
      </Button>
      <Button type="submit" isLoading={pending}>
        Save changes
      </Button>
    </div>
  );
}
