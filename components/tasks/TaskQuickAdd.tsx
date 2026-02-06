"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createTask } from "@/server/actions/tasks";
import { initialTaskActionState, type TaskActionState } from "@/server/actions/taskState";

type TaskQuickAddProps = {
  weekId: string;
};

export default function TaskQuickAdd({ weekId }: TaskQuickAddProps) {
  const [state, formAction] = useActionState<TaskActionState, FormData>(
    createTask,
    initialTaskActionState
  );
  const { addToast } = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const lastSubmittedTitle = useRef("");

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setTitle("");
      setLocalError(null);
      lastSubmittedTitle.current = "";
      addToast({
        title: "Task added",
        description: state.message ?? "Your task is ready.",
        status: "success"
      });
      router.refresh();
    }
  }, [addToast, router, state]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const trimmedTitle = title.trim();
    lastSubmittedTitle.current = trimmedTitle;
    if (!trimmedTitle) {
      event.preventDefault();
      setLocalError("Add a task title to continue.");
      return;
    }
    setLocalError(null);
  };

  const trimmedTitle = title.trim();
  const errorMessage =
    localError ??
    (state.status === "error" && lastSubmittedTitle.current === trimmedTitle
      ? state.message?.includes("Expected string")
        ? "Add a task title to continue."
        : state.message
      : null);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="weekId" value={weekId} />
      <input type="hidden" name="visibility" value="private" />
      <input type="hidden" name="volunteersNeeded" value="1" />
      <Input
        name="title"
        placeholder="Quick add a task..."
        aria-label="Quick add a task"
        required
        className="flex-1"
        value={title}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !trimmedTitle) {
            event.preventDefault();
            setLocalError("Add a task title to continue.");
          }
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          setTitle(nextValue);
          if (localError) {
            setLocalError(null);
          }
          if (state.status === "error") {
            lastSubmittedTitle.current = "";
          }
        }}
      />
      <Button type="submit" disabled={!title.trim()} className="h-9 shrink-0 px-3 text-sm">
        + Add
      </Button>
      {errorMessage ? (
        <p className="text-xs text-rose-600">{errorMessage}</p>
      ) : null}
    </form>
  );
}
