"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useTranslations } from "@/lib/i18n/provider";
import type { TaskListItem } from "@/lib/queries/tasks";

type TaskCompletionDialogProps = {
  task: TaskListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: {
    taskId: string;
    hoursMode: "estimated" | "manual" | "skip";
    manualHours?: number | null;
  }) => Promise<void>;
};

export default function TaskCompletionDialog({
  task,
  open,
  onOpenChange,
  onConfirm
}: TaskCompletionDialogProps) {
  const t = useTranslations();
  const [hoursMode, setHoursMode] = useState<"estimated" | "manual" | "skip">("estimated");
  const [manualHours, setManualHours] = useState("");

  useEffect(() => {
    if (open) {
      setHoursMode("estimated");
      setManualHours("");
    }
  }, [open, task?.id]);

  const parsedManualHours = useMemo(() => {
    if (manualHours.trim().length === 0) {
      return null;
    }
    const parsed = Number(manualHours);
    return Number.isNaN(parsed) ? null : parsed;
  }, [manualHours]);

  const manualInvalid = hoursMode === "manual" && parsedManualHours === null;
  const estimatedLabel =
    task?.estimatedHours !== null && task?.estimatedHours !== undefined
      ? `${task.estimatedHours} hrs`
      : t("taskCompletion.noEstimate");

  const handleConfirm = async () => {
    if (!task) {
      return;
    }
    await onConfirm({
      taskId: task.id,
      hoursMode,
      manualHours: hoursMode === "manual" ? parsedManualHours ?? undefined : undefined
    });
  };

  const content = (
    <div className="space-y-4">
      {/* Accent header banner */}
      <div className="rounded-xl border-l-4 border-l-emerald-400 bg-emerald-50/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-emerald-800">{t("taskCompletion.logHoursTitle")}</h3>
        <p className="mt-0.5 text-xs text-emerald-600">
          {t("taskCompletion.logHoursDescription")}
        </p>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1.5 text-sm font-medium text-ink-700">
          <span>{t("taskCompletion.howToLog")}</span>
          <select
            value={hoursMode}
            onChange={(event) =>
              setHoursMode(
                event.target.value === "manual"
                  ? "manual"
                  : event.target.value === "skip"
                    ? "skip"
                    : "estimated"
              )
            }
            className="mt-1 w-full rounded-xl border border-mist-200 bg-white px-3 py-2.5 text-sm text-ink-700 shadow-sm focus-ring"
          >
            <option value="estimated">{t("taskCompletion.useEstimated")}</option>
            <option value="manual">{t("taskCompletion.enterActual")}</option>
            <option value="skip">{t("taskCompletion.skipLogging")}</option>
          </select>
        </label>

        {hoursMode === "estimated" ? (
          <p className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-xs text-sky-700">
            {t("taskCompletion.estimatedInfo", { label: estimatedLabel })}
          </p>
        ) : null}

        {hoursMode === "manual" ? (
          <label className="block space-y-1.5 text-sm font-medium text-ink-700">
            <span>{t("taskCompletion.hoursPerParticipant")}</span>
            <Input
              type="number"
              min="0"
              step="0.25"
              value={manualHours}
              onChange={(event) => setManualHours(event.target.value)}
              placeholder={t("taskCompletion.hoursPlaceholder")}
              aria-invalid={manualInvalid}
            />
          </label>
        ) : null}

        {hoursMode === "skip" ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-700">
            {t("taskCompletion.skipInfo")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          {t("buttons.cancel")}
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={manualInvalid}>
          {t("taskCompletion.completeTask")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={() => onOpenChange(false)} title={t("taskCompletion.dialogTitle")}>
        {content}
      </Modal>
      <Drawer open={open} onClose={() => onOpenChange(false)} title={t("taskCompletion.dialogTitle")}>
        {content}
      </Drawer>
    </>
  );
}
