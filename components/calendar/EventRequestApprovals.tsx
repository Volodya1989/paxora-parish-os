"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { PendingEventRequest } from "@/lib/queries/eventRequests";
import { approveEventRequest, rejectEventRequest } from "@/server/actions/eventRequests";

const formatDateTime = (startsAt: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(startsAt);

const formatCategory = (category: PendingEventRequest["category"]) => {
  switch (category) {
    case "SERVICE":
      return "Service";
    case "REHEARSAL":
      return "Rehearsal";
    case "GATHERING":
      return "Community gathering";
    default:
      return "Other";
  }
};

type EventRequestApprovalsProps = {
  requests: PendingEventRequest[];
};

export default function EventRequestApprovals({ requests }: EventRequestApprovalsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"approve" | "reject" | null>(null);

  if (requests.length === 0) {
    return null;
  }

  const handleAction = (requestId: string, action: "approve" | "reject") => {
    setActiveRequestId(requestId);
    setActiveAction(action);
    startTransition(async () => {
      try {
        if (action === "approve") {
          await approveEventRequest({ requestId });
        } else {
          await rejectEventRequest({ requestId });
        }
        router.refresh();
      } finally {
        setActiveRequestId(null);
        setActiveAction(null);
      }
    });
  };

  return (
    <Card className="space-y-4">
      <div className="text-xs font-semibold text-ink-500">Pending event requests</div>
      <div className="space-y-4">
        {requests.map((request) => {
          const requesterName = request.requester.name ?? request.contactName;
          const isActive = activeRequestId === request.id;
          return (
            <div key={request.id} className="rounded-card border border-mist-200 bg-white p-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{request.title}</p>
                    <p className="text-xs text-ink-500">
                      {formatCategory(request.category)} · {formatDateTime(request.startsAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-mist-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                    {requesterName}
                  </span>
                </div>
                {request.location ? (
                  <p className="text-xs text-ink-500">Location: {request.location}</p>
                ) : null}
                {request.participants ? (
                  <p className="text-xs text-ink-500">Expected participants: {request.participants}</p>
                ) : null}
                {request.description ? (
                  <p className="text-xs text-ink-500">{request.description}</p>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={isPending && isActive && activeAction === "reject"}
                  onClick={() => handleAction(request.id, "reject")}
                >
                  Decline
                </Button>
                <Button
                  type="button"
                  size="sm"
                  isLoading={isPending && isActive && activeAction === "approve"}
                  onClick={() => handleAction(request.id, "approve")}
                >
                  Approve
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
