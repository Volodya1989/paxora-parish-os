"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RequestStatus } from "@prisma/client";
import Button from "@/components/ui/Button";
import {
  cancelOwnRequest,
  respondToScheduledRequest
} from "@/server/actions/requests";

type RequestDetailActionsProps = {
  requestId: string;
  status: RequestStatus;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
};

export default function RequestDetailActions({
  requestId,
  status,
  scheduledStart,
  scheduledEnd
}: RequestDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRespond = (response: "ACCEPT" | "REJECT") => {
    startTransition(async () => {
      const result = await respondToScheduledRequest({ requestId, response });
      if (result.status === "success") {
        router.refresh();
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelOwnRequest({ requestId });
      if (result.status === "success") {
        router.refresh();
      }
    });
  };

  const canCancel = status !== "COMPLETED" && status !== "CANCELED";

  return (
    <div className="space-y-3">
      {status === "SCHEDULED" && scheduledStart ? (
        <div className="rounded-card border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          Proposed time:{" "}
          <span className="font-semibold">
            {new Date(scheduledStart).toLocaleString()}
          </span>
          {scheduledEnd ? ` – ${new Date(scheduledEnd).toLocaleTimeString()}` : null}
        </div>
      ) : null}

      {status === "SCHEDULED" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => handleRespond("ACCEPT")} isLoading={isPending}>
            Accept time
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleRespond("REJECT")}
            isLoading={isPending}
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
        >
          Cancel request
        </Button>
      ) : null}
    </div>
  );
}

