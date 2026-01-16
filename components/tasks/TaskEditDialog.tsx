"use client";

import { useActionState, useEffect, useId, useRef, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
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
};

export default function TaskEditDialog({ open, onOpenChange, task }: TaskEditDialogProps) {
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
