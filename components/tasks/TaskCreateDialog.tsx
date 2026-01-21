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
import { createTask } from "@/server/actions/tasks";
import {
  initialTaskActionState,
  type TaskActionState
} from "@/server/actions/taskState";
import { shouldCloseTaskDialog } from "@/components/tasks/taskDialogSuccess";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDueAt() {
  const next = new Date();
  next.setDate(next.getDate() + 14);
  return next;
}

type TaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: string;
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string; label?: string }>;
  currentUserId: string;
};

export default function TaskCreateDialog({
  open,
  onOpenChange,
  weekId,
  groupOptions,
  memberOptions,
  currentUserId
}: TaskCreateDialogProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [state, formAction] = useActionState<TaskActionState, FormData>(
    createTask,
    initialTaskActionState
  );
  const handledSuccess = useRef(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [volunteersNeeded, setVolunteersNeeded] = useState("1");
  const [, startTransition] = useTransition();
  const modalFormRef = useRef<HTMLFormElement>(null);
  const drawerFormRef = useRef<HTMLFormElement>(null);
  const modalFormId = useId();
  const drawerFormId = useId();
  const titleId = useId();
  const notesId = useId();
  const estimatedHoursId = useId();
  const volunteersId = useId();
  const dueAtId = useId();
  const groupId = useId();
  const ownerId = useId();
  const visibilityId = useId();

  useEffect(() => {
    if (open) {
      handledSuccess.current = false;
      setVolunteersNeeded("1");
    }
  }, [open]);

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
    setFormResetKey((prev) => prev + 1);
    addToast({
      title: "Task saved",
      description: state.message ?? "Your task is ready for the team."
    });
    onOpenChange(false);
    startTransition(() => {
      router.refresh();
    });
  }, [addToast, onOpenChange, router, startTransition, state]);

  const renderForm = (formId: string, ref: RefObject<HTMLFormElement>) => (
    <form
      key={`${formId}-${formResetKey}`}
      ref={ref}
      id={formId}
      className="space-y-4"
      action={formAction}
    >
      <input type="hidden" name="weekId" value={weekId} />
      <div className="space-y-2">
        <Label htmlFor={titleId}>Title</Label>
        <Input id={titleId} name="title" placeholder="Add a clear task title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={notesId}>Notes (optional)</Label>
        <Textarea
          id={notesId}
          name="notes"
          placeholder="Include links, dependencies, or context for the team."
          rows={4}
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
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={dueAtId}>Due date</Label>
        <Input
          id={dueAtId}
          name="dueAt"
          type="date"
          defaultValue={formatDateInput(getDefaultDueAt())}
        />
        <p className="text-xs text-ink-400">Defaults to two weeks from today.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={volunteersId}>Volunteers needed</Label>
        <Input
          id={volunteersId}
          name="volunteersNeeded"
          type="number"
          min={1}
          step={1}
          value={volunteersNeeded}
          onChange={(event) => setVolunteersNeeded(event.target.value)}
        />
        <p className="text-xs text-ink-400">
          Set this above 1 to allow multiple volunteers to join.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={visibilityId}>Visibility</Label>
        <SelectMenu
          id={visibilityId}
          name="visibility"
          defaultValue="public"
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
            defaultValue=""
            placeholder="No group"
            options={[
              { value: "", label: "No group" },
              ...groupOptions.map((group) => ({ value: group.id, label: group.name }))
            ]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={ownerId}>
            {Number(volunteersNeeded) > 1 ? "Lead (optional)" : "Assignee (optional)"}
          </Label>
          <SelectMenu
            id={ownerId}
            name="ownerId"
            defaultValue=""
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
      <TaskCreateActions onCancel={() => onOpenChange(false)} />
    </form>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        title="New task"
      >
        <p className="mb-4 text-sm text-ink-500">
          Capture what needs attention this week and assign it to the right owner.
        </p>
        {renderForm(modalFormId, modalFormRef)}
      </Modal>
      <Drawer
        open={open}
        onClose={() => onOpenChange(false)}
        title="New task"
      >
        <p className="mb-4 text-sm text-ink-500">
          Capture what needs attention this week and assign it to the right owner.
        </p>
        {renderForm(drawerFormId, drawerFormRef)}
      </Drawer>
    </>
  );
}

function TaskCreateActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-6 flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" isLoading={pending}>
        Create task
      </Button>
    </div>
  );
}
