"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RequestStatus } from "@prisma/client";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  cancelOwnRequest,
  respondToScheduledRequest
} from "@/server/actions/requests";

type RequestDetailActionsProps = {
  requestId: string;
  status: RequestStatus;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  scheduleResponseStatus?: "ACCEPTED" | "REJECTED" | null;
};

export default function RequestDetailActions({
  requestId,
  status,
  scheduledStart,
  scheduledEnd,
  scheduleResponseStatus
}: RequestDetailActionsProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [responseState, setResponseState] = useState<"ACCEPTED" | "REJECTED" | null>(
    scheduleResponseStatus ?? null
  );

  useEffect(() => {
    setResponseState(scheduleResponseStatus ?? null);
  }, [scheduleResponseStatus]);

  const handleRespond = (response: "ACCEPT" | "REJECT") => {
    if (isPending || responseState) return;
    startTransition(async () => {
      const result = await respondToScheduledRequest({ requestId, response });
      if (result.status === "success") {
        addToast({ title: result.message ?? "Request updated.", status: "success" });
        setResponseState(response === "ACCEPT" ? "ACCEPTED" : "REJECTED");
        router.refresh();
        return;
      }
      addToast({ title: result.message ?? "Unable to update request.", status: "error" });
    });
  };

  const handleCancel = () => {
    if (isPending) return;
    startTransition(async () => {
      const result = await cancelOwnRequest({ requestId });
      if (result.status === "success") {
        addToast({ title: result.message ?? "Request canceled.", status: "success" });
        router.refresh();
        return;
      }
      addToast({ title: result.message ?? "Unable to cancel request.", status: "error" });
    });
  };

  const canCancel = status !== "COMPLETED" && status !== "CANCELED";

  const hasSchedule = status === "SCHEDULED" && Boolean(scheduledStart);
  const responseMessage =
    responseState === "ACCEPTED"
      ? "Scheduled time confirmed."
      : responseState === "REJECTED"
        ? "You declined the proposed time."
        : null;

  return (
    <div className="space-y-3">
      {hasSchedule ? (
        <div className="rounded-card border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          Proposed time:{" "}
          <span className="font-semibold">
            {new Date(scheduledStart as string).toLocaleString()}
          </span>
          {scheduledEnd ? ` – ${new Date(scheduledEnd).toLocaleTimeString()}` : null}
        </div>
      ) : null}

      {status === "SCHEDULED" && !scheduledStart ? (
        <div className="rounded-card border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-700">
          Scheduling details are being finalized. Please check back soon.
        </div>
      ) : null}

      {responseMessage ? (
        <div className="rounded-card border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          {responseMessage}
        </div>
      ) : null}

      {hasSchedule && !responseState ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => handleRespond("ACCEPT")}
            isLoading={isPending}
            disabled={isPending}
          >
            Accept time
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleRespond("REJECT")}
            isLoading={isPending}
            disabled={isPending}
          >
            Reject time
          </Button>
        </div>
      ) : null}

      {canCancel ? (
        <Button
          type="button"
          variant="ghost"
          className="text-rose-600 hover:text-rose-700"
          onClick={handleCancel}
          isLoading={isPending}
          disabled={isPending}
        >
          Cancel request
        </Button>
      ) : null}
    </div>
  );
}
