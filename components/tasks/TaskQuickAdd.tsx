"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { createTask } from "@/server/actions/tasks";
import { initialTaskActionState, type TaskActionState } from "@/server/actions/taskState";
import { useTranslations } from "@/lib/i18n/provider";

type TaskQuickAddProps = {
  weekId: string;
  creationContext?: "default" | "my_commitments";
};

export default function TaskQuickAdd({ weekId, creationContext = "default" }: TaskQuickAddProps) {
  const t = useTranslations();
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
        title: t("tasks.quickAdd.added"),
        description: state.message ?? t("tasks.quickAdd.ready"),
        status: "success"
      });
      router.refresh();
    }
  }, [addToast, router, state, t]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const trimmedTitle = title.trim();
    lastSubmittedTitle.current = trimmedTitle;
    if (!trimmedTitle) {
      event.preventDefault();
      setLocalError(t("tasks.quickAdd.addTitle"));
      return;
    }
    setLocalError(null);
  };

  const trimmedTitle = title.trim();
  const errorMessage =
    localError ??
    (state.status === "error" && lastSubmittedTitle.current === trimmedTitle
      ? state.message?.includes("Expected string")
        ? t("tasks.quickAdd.addTitle")
        : state.message
      : null);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      action={formAction}
      className="flex flex-row items-center gap-2"
    >
      <input type="hidden" name="weekId" value={weekId} />
      <input type="hidden" name="visibility" value="private" />
      <input type="hidden" name="volunteersNeeded" value="1" />
      <input type="hidden" name="creationContext" value={creationContext} />
      <Input
        name="title"
        placeholder={t("tasks.quickAdd.placeholder")}
        aria-label={t("tasks.quickAdd.aria")}
        required
        className="flex-1"
        value={title}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !trimmedTitle) {
            event.preventDefault();
            setLocalError(t("tasks.quickAdd.addTitle"));
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
        {t("header.addButton")}
      </Button>
      {errorMessage ? (
        <p className="text-xs text-rose-600">{errorMessage}</p>
      ) : null}
    </form>
  );
}
