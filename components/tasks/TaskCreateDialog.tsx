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
import { useTranslations } from "@/lib/i18n/provider";
import RequestSuccessState from "@/components/shared/RequestSuccessState";

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
  initialVisibility?: "private" | "public";
  forcePrivate?: boolean;
  forcePublic?: boolean;
  requestMode?: boolean;
  creationContext?: "default" | "my_commitments";
};

export default function TaskCreateDialog({
  open,
  onOpenChange,
  weekId,
  groupOptions,
  memberOptions,
  currentUserId,
  initialVisibility = "private",
  forcePrivate = false,
  forcePublic = false,
  requestMode = false,
  creationContext = "default"
}: TaskCreateDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const { addToast } = useToast();
  const [state, formAction] = useActionState<TaskActionState, FormData>(
    createTask,
    initialTaskActionState
  );
  const handledSuccess = useRef(false);
  const prevStatus = useRef(state.status);
  const prevOpen = useRef(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [volunteersNeeded, setVolunteersNeeded] = useState("1");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [submitted, setSubmitted] = useState(false);
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
    if (open && !prevOpen.current) {
      handledSuccess.current = state.status === "success";
      prevStatus.current = state.status;
      const nextInitialVisibility = forcePublic ? "public" : initialVisibility;
      setVolunteersNeeded(nextInitialVisibility === "public" ? "2" : "1");
      setVisibility(nextInitialVisibility);
      setSubmitted(false);
    }
    prevOpen.current = open;
  }, [forcePublic, initialVisibility, open, state.status]);

  useEffect(() => {
    const wasSuccess = prevStatus.current === "success";
    const isSuccess = state.status === "success";

    if (!isSuccess) {
      handledSuccess.current = false;
      prevStatus.current = state.status;
      return;
    }

    if (wasSuccess) {
      prevStatus.current = state.status;
      return;
    }

    if (!shouldCloseTaskDialog(state, handledSuccess.current)) {
      prevStatus.current = state.status;
      return;
    }

    handledSuccess.current = true;
    modalFormRef.current?.reset();
    drawerFormRef.current?.reset();
    setFormResetKey((prev) => prev + 1);
    if (requestMode) {
      setSubmitted(true);
      startTransition(() => {
        router.refresh();
      });
      prevStatus.current = state.status;
      return;
    }

    addToast({
      title: t("taskCreate.toastSavedTitle"),
      description: state.message ?? t("taskCreate.toastSavedDescription"),
      status: "success"
    });
    onOpenChange(false);
    startTransition(() => {
      router.refresh();
    });
    prevStatus.current = state.status;
  }, [addToast, onOpenChange, requestMode, router, startTransition, state, t]);

  const renderForm = (formId: string, ref: RefObject<HTMLFormElement>) => (
    submitted && requestMode ? (
      <RequestSuccessState
        message="Your request is pending approval from parish leadership."
        onDone={() => onOpenChange(false)}
      />
    ) : (
    <form
      key={`${formId}-${formResetKey}`}
      ref={ref}
      id={formId}
      className="space-y-3"
      action={formAction}
      onSubmit={() => {
        handledSuccess.current = false;
        prevStatus.current = "idle";
      }}
    >
      <input type="hidden" name="weekId" value={weekId} />
      <input type="hidden" name="creationContext" value={creationContext} />

      {/* Accent header banner */}
      <div className="rounded-xl border-l-4 border-l-sky-400 bg-sky-50/60 px-3 py-2">
        <p className="text-xs text-sky-700">
          {requestMode
            ? t("taskCreate.requestBanner")
            : t("taskCreate.createBanner")}
        </p>
      </div>

      {/* Section: Basics */}
      <fieldset className="space-y-3 rounded-xl border border-mist-100 bg-mist-50/40 p-3">
        <div className="space-y-1.5">
          <Label htmlFor={titleId}>{t("taskCreate.title")}</Label>
          <Input id={titleId} name="title" placeholder={t("taskCreate.titlePlaceholder")} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={notesId}>{t("taskCreate.notesOptional")}</Label>
          <Textarea
            id={notesId}
            name="notes"
            placeholder={t("taskCreate.notesPlaceholder")}
            rows={2}
          />
        </div>
      </fieldset>

      {/* Section: Timing */}
      <div className="grid gap-3 sm:grid-cols-2">
        {!forcePrivate ? (
          <div className="space-y-1.5">
            <Label htmlFor={estimatedHoursId}>{t("taskCreate.estimatedHours")}</Label>
            <Input
              id={estimatedHoursId}
              name="estimatedHours"
              type="number"
              min={0}
              step="0.25"
              placeholder={t("taskCreate.estimatedHoursPlaceholder")}
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor={dueAtId}>{t("taskCreate.dueDate")}</Label>
          <Input
            id={dueAtId}
            name="dueAt"
            type="date"
            defaultValue={formatDateInput(getDefaultDueAt())}
          />
        </div>
      </div>

      {/* Section: Visibility & Assignment */}
      {forcePrivate ? (
        <>
          <input type="hidden" name="visibility" value="private" />
          <p className="rounded-xl border border-mist-200 bg-mist-50 px-3 py-2 text-xs text-ink-500">
            {t("taskCreate.privateHint")}
          </p>
        </>
      ) : forcePublic ? (
        <>
          <input type="hidden" name="visibility" value="public" />
          <p className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-800">
            {t("taskCreate.publicRequestHint")}
          </p>
        </>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={visibilityId}>{t("taskCreate.visibility")}</Label>
          <SelectMenu
            id={visibilityId}
            name="visibility"
            value={visibility}
            onValueChange={(nextValue) => {
              const nextVisibility = nextValue === "public" ? "public" : "private";
              setVisibility(nextVisibility);
              if (nextVisibility === "private") {
                setVolunteersNeeded("1");
              }
            }}
            options={[
              { value: "private", label: t("taskCreate.visibilityPrivate") },
              { value: "public", label: t("taskCreate.visibilityPublic") }
            ]}
          />
          <p className="text-xs text-ink-400">
            {visibility === "public"
              ? t("taskCreate.visibilityPublicHint")
              : t("taskCreate.visibilityPrivateHint")}
          </p>
        </div>
      )}
      {visibility === "private" || forcePrivate ? (
        <>
          <input type="hidden" name="volunteersNeeded" value="1" />
          <input type="hidden" name="ownerId" value={currentUserId} />
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={volunteersId}>{t("taskCreate.volunteersNeeded")}</Label>
            <Input
              id={volunteersId}
              name="volunteersNeeded"
              type="number"
              min={1}
              step={1}
              value={volunteersNeeded}
              onChange={(event) => setVolunteersNeeded(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={groupId}>{t("taskCreate.group")}</Label>
              <SelectMenu
                id={groupId}
                name="groupId"
                defaultValue=""
                placeholder={t("taskCreate.noGroup")}
                options={[
                  { value: "", label: t("taskCreate.noGroup") },
                  ...groupOptions.map((group) => ({ value: group.id, label: group.name }))
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ownerId}>
                {Number(volunteersNeeded) > 1
                  ? t("taskCreate.leadOptional")
                  : t("taskCreate.assigneeOptional")}
              </Label>
              <SelectMenu
                id={ownerId}
                name="ownerId"
                defaultValue=""
                options={memberOptions.map((member) => ({
                  value: member.id,
                  label: `${member.name}${member.id === currentUserId ? ` ${t("taskCreate.youSuffix")}` : ""}`
                }))}
              />
            </div>
          </div>
        </>
      )}

      {state.status === "error" ? (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-xs text-rose-700">
          {state.message}
        </p>
      ) : null}
      <TaskCreateActions
        onCancel={() => onOpenChange(false)}
        submitLabel={requestMode ? t("taskCreate.sendRequest") : t("taskCreate.createTask")}
      />
    </form>
    )
  );

  return (
    <>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        title={requestMode ? t("taskCreate.requestTask") : t("taskCreate.newTask")}
      >
        {renderForm(modalFormId, modalFormRef)}
      </Modal>
      <Drawer
        open={open}
        onClose={() => onOpenChange(false)}
        title={requestMode ? t("taskCreate.requestTask") : t("taskCreate.newTask")}
      >
        {renderForm(drawerFormId, drawerFormRef)}
      </Drawer>
    </>
  );
}

function TaskCreateActions({
  onCancel,
  submitLabel
}: {
  onCancel: () => void;
  submitLabel: string;
}) {
  const t = useTranslations();
  const { pending } = useFormStatus();

  return (
    <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-mist-100 bg-white pb-1 pt-3">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        {t("buttons.cancel")}
      </Button>
      <Button type="submit" isLoading={pending}>
        {submitLabel}
      </Button>
    </div>
  );
}
