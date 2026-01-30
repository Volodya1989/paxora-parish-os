"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
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
      : "No estimate set";

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
      <div>
        <h3 className="text-base font-semibold text-ink-900">Log volunteer hours</h3>
        <p className="text-sm text-ink-500">
          Keep gratitude grounded with a quick hours entry for this task.
        </p>
      </div>

      <div className="space-y-3">
        <label className="space-y-1 text-sm font-medium text-ink-700">
          Hours mode
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
            className="mt-1 w-full rounded-button border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card focus-ring"
          >
            <option value="estimated">Use estimated allocation</option>
            <option value="manual">Enter actual hours</option>
            <option value="skip">Skip logging for now</option>
          </select>
        </label>

        {hoursMode === "estimated" ? (
          <p className="rounded-card border border-mist-200 bg-mist-50 px-3 py-2 text-xs text-ink-500">
            Estimated allocation will use {estimatedLabel} and distribute it across participants.
          </p>
        ) : null}

        {hoursMode === "manual" ? (
          <label className="space-y-1 text-sm font-medium text-ink-700">
            Hours per participant
            <Input
              type="number"
              min="0"
              step="0.25"
              value={manualHours}
              onChange={(event) => setManualHours(event.target.value)}
              placeholder="e.g. 1.5"
              aria-invalid={manualInvalid}
            />
          </label>
        ) : null}

        {hoursMode === "skip" ? (
          <p className="rounded-card border border-mist-200 bg-mist-50 px-3 py-2 text-xs text-ink-500">
            No hours entry will be created for this completion.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={manualInvalid}>
          Complete task
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={() => onOpenChange(false)} title="Complete task">
        {content}
      </Modal>
      <Drawer open={open} onClose={() => onOpenChange(false)} title="Complete task">
        {content}
      </Drawer>
    </>
  );
}
