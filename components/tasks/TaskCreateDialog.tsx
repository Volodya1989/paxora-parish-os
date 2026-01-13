"use client";

import { useActionState, useEffect, useId, useRef, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { createTask } from "@/server/actions/tasks";
import {
  initialTaskActionState,
  type TaskActionState
} from "@/server/actions/taskState";

type TaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: string;
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string }>;
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
  const [state, formAction] = useActionState<TaskActionState, FormData>(
    createTask,
    initialTaskActionState
  );
  const modalFormRef = useRef<HTMLFormElement>(null);
  const drawerFormRef = useRef<HTMLFormElement>(null);
  const modalFormId = useId();
  const drawerFormId = useId();
  const titleId = useId();
  const notesId = useId();
  const groupId = useId();
  const ownerId = useId();

  useEffect(() => {
    if (state.status === "success") {
      modalFormRef.current?.reset();
      drawerFormRef.current?.reset();
      onOpenChange(false);
    }
  }, [onOpenChange, state.status]);

  const renderForm = (formId: string, ref: RefObject<HTMLFormElement>) => (
    <form ref={ref} id={formId} className="space-y-4" action={formAction}>
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={groupId}>Group</Label>
          <Select id={groupId} name="groupId" defaultValue="">
            <option value="">No group</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={ownerId}>Assignee</Label>
          <Select id={ownerId} name="ownerId" defaultValue={currentUserId}>
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
                {member.id === currentUserId ? " (You)" : ""}
              </option>
            ))}
          </Select>
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
