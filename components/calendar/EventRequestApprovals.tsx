"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PendingRequestsSection from "@/components/requests/PendingRequestsSection";
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

  if (requests.length === 0) {
    return null;
  }

  const handleAction = (requestId: string, action: "approve" | "reject") => {
    setActiveRequestId(requestId);
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
      }
    });
  };

  const items = requests.map((request) => {
    const requesterName = request.requester.name ?? request.contactName;
    const isActive = activeRequestId === request.id;

    return {
      id: request.id,
      title: request.title,
      subtitle: `${formatCategory(request.category)} · ${formatDateTime(request.startsAt)}`,
      description: [
        request.location ? `Location: ${request.location}` : null,
        request.participants ? `Expected participants: ${request.participants}` : null,
        request.description ?? null,
        `Requested by ${requesterName}`
      ]
        .filter(Boolean)
        .join(" · "),
      badgeLabel: "parish",
      isBusy: isPending && isActive,
      onApprove: () => handleAction(request.id, "approve"),
      onReject: () => handleAction(request.id, "reject")
    };
  });

  return <PendingRequestsSection heading="Pending event requests" items={items} />;
}
