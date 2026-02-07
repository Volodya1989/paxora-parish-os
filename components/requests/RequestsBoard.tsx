"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RequestDetail } from "@/lib/queries/requests";
import type { RequestStatus, VisibilityScope } from "@prisma/client";
import { Drawer } from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import Badge from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatMessageTime } from "@/lib/time/messageTime";
import {
  REQUEST_STATUS_ORDER,
  REQUEST_STATUS_TONES,
  REQUEST_VISIBILITY_LABELS,
  REQUEST_VISIBILITY_HELP,
  getRequestStatusLabel,
  getRequestTypeLabel,
  isRequestOverdue
} from "@/lib/requests/utils";
import { assignRequest, updateRequestStatus, updateRequestVisibility } from "@/server/actions/requests";

const statusOptions: Array<{ value: RequestStatus; label: string }> = REQUEST_STATUS_ORDER.map(
  (status) => ({ value: status, label: getRequestStatusLabel(status) })
);

const visibilityOptions: Array<{ value: VisibilityScope; label: string }> = [
  { value: "CLERGY_ONLY", label: REQUEST_VISIBILITY_LABELS.CLERGY_ONLY },
  { value: "ADMIN_ALL", label: REQUEST_VISIBILITY_LABELS.ADMIN_ALL },
  { value: "ADMIN_SPECIFIC", label: REQUEST_VISIBILITY_LABELS.ADMIN_SPECIFIC }
];

const filterTypes = [
  { value: "", label: "All types" },
  { value: "CONFESSION", label: "Confession" },
  { value: "TALK_TO_PRIEST", label: "Talk to a priest" },
  { value: "PRAYER", label: "Prayer" },
  { value: "LITURGICAL", label: "Liturgical" }
];

const filterVisibility = [
  { value: "", label: "All scopes" },
  { value: "CLERGY_ONLY", label: "Clergy only" },
  { value: "ADMIN_ALL", label: "All clergy + admins" },
  { value: "ADMIN_SPECIFIC", label: "Clergy + assigned" }
];

export type RequestsBoardProps = {
  requests: RequestDetail[];
  assignees: Array<{ id: string; name: string | null; email: string }>;
};

export default function RequestsBoard({ requests, assignees }: RequestsBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUpdating, startTransition] = useTransition();

  const requestIdParam = searchParams?.get("requestId");

  useEffect(() => {
    if (requestIdParam && requestIdParam !== selectedId) {
      setSelectedId(requestIdParam);
    }
  }, [requestIdParam, selectedId]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId]
  );

  const grouped = useMemo(() => {
    return REQUEST_STATUS_ORDER.map((status) => ({
      status,
      items: requests.filter((request) => request.status === status)
    }));
  }, [requests]);

  const openRequest = (requestId: string) => {
    setSelectedId(requestId);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("requestId", requestId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const closeRequest = () => {
    setSelectedId(null);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (params.has("requestId")) {
      params.delete("requestId");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const toggleOverdue = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (params.get("overdue") === "true") {
      params.delete("overdue");
    } else {
      params.set("overdue", "true");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleStatusChange = (status: RequestStatus) => {
    if (!selectedRequest) return;
    setStatusMessage(null);
    startTransition(async () => {
      const result = await updateRequestStatus({ requestId: selectedRequest.id, status });
      if (result.status === "error") {
        setStatusMessage(result.message ?? "Unable to update status.");
        return;
      }
      router.refresh();
    });
  };

  const handleVisibilityChange = (visibilityScope: VisibilityScope) => {
    if (!selectedRequest) return;
    setStatusMessage(null);
    startTransition(async () => {
      const result = await updateRequestVisibility({ requestId: selectedRequest.id, visibilityScope });
      if (result.status === "error") {
        setStatusMessage(result.message ?? "Unable to update visibility.");
        return;
      }
      router.refresh();
    });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    if (!selectedRequest) return;
    setStatusMessage(null);
    startTransition(async () => {
      const result = await assignRequest({
        requestId: selectedRequest.id,
        assigneeId: assigneeId || null
      });
      if (result.status === "error") {
        setStatusMessage(result.message ?? "Unable to update assignment.");
        return;
      }
      router.refresh();
    });
  };

  const formatAssigneeLabel = (assignee: { id: string; name: string | null; email: string }) =>
    assignee.name ? `${assignee.name} (${assignee.email})` : assignee.email;

  const overdueLabel = (request: RequestDetail) =>
    isRequestOverdue(request.status, request.createdAt, request.updatedAt) ? "Overdue" : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SelectMenu
          value={searchParams?.get("type") ?? ""}
          onValueChange={(value) => updateFilter("type", value)}
          options={filterTypes}
        />
        <SelectMenu
          value={searchParams?.get("assignee") ?? ""}
          onValueChange={(value) => updateFilter("assignee", value)}
          options={[
            { value: "", label: "All assignees" },
            ...assignees.map((assignee) => ({
              value: assignee.id,
              label: formatAssigneeLabel(assignee)
            }))
          ]}
        />
        <SelectMenu
          value={searchParams?.get("scope") ?? ""}
          onValueChange={(value) => updateFilter("scope", value)}
          options={filterVisibility}
        />
        <Button
          variant={searchParams?.get("overdue") === "true" ? "primary" : "secondary"}
          onClick={toggleOverdue}
          className="h-10"
        >
          Overdue
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {grouped.map((group) => (
          <div key={group.status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-700">
                {getRequestStatusLabel(group.status)}
              </h3>
              <span className="text-xs text-ink-400">{group.items.length}</span>
            </div>
            <div className="space-y-2">
              {group.items.length === 0 ? (
                <Card>
                  <CardDescription>No requests here.</CardDescription>
                </Card>
              ) : (
                group.items.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => openRequest(request.id)}
                    className="w-full text-left"
                  >
                    <Card className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">{request.title}</CardTitle>
                        <Badge tone={REQUEST_STATUS_TONES[request.status]}>
                          {getRequestStatusLabel(request.status)}
                        </Badge>
                      </div>
                      <div className="text-xs text-ink-500">
                        {getRequestTypeLabel(request.type)} · Updated {formatMessageTime(request.updatedAt)}
                      </div>
                      {request.assignedTo?.name ? (
                        <div className="text-xs text-ink-500">Assigned to {request.assignedTo.name}</div>
                      ) : (
                        <div className="text-xs text-ink-400">Unassigned</div>
                      )}
                      {overdueLabel(request) ? (
                        <Badge tone="warning">Overdue</Badge>
                      ) : null}
                    </Card>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <Drawer
        open={Boolean(selectedRequest)}
        onClose={closeRequest}
        title="Request details"
      >
        {selectedRequest ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink-900">{selectedRequest.title}</h2>
              <p className="text-sm text-ink-500">
                {getRequestTypeLabel(selectedRequest.type)} · Updated {formatMessageTime(selectedRequest.updatedAt)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={REQUEST_STATUS_TONES[selectedRequest.status]}>
                  {getRequestStatusLabel(selectedRequest.status)}
                </Badge>
                {overdueLabel(selectedRequest) ? <Badge tone="warning">Overdue</Badge> : null}
              </div>
            </div>

            {statusMessage ? (
              <div className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {statusMessage}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-700">Status</label>
              <SelectMenu
                value={selectedRequest.status}
                onValueChange={(value) => handleStatusChange(value as RequestStatus)}
                disabled={isUpdating}
                options={statusOptions}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-700">Assign to</label>
              <SelectMenu
                value={selectedRequest.assignedTo?.id ?? ""}
                onValueChange={handleAssigneeChange}
                disabled={isUpdating}
                options={[
                  { value: "", label: "Unassigned" },
                  ...assignees.map((assignee) => ({
                    value: assignee.id,
                    label: formatAssigneeLabel(assignee)
                  }))
                ]}
              />
              {selectedRequest.visibilityScope === "CLERGY_ONLY" ? (
                <p className="text-xs text-ink-500">
                  Clergy-only requests can only be assigned to clergy. Change visibility to involve admins.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink-700">Visibility</label>
              <SelectMenu
                value={selectedRequest.visibilityScope}
                onValueChange={(value) => handleVisibilityChange(value as VisibilityScope)}
                disabled={isUpdating}
                options={visibilityOptions}
              />
              <p className="text-xs text-ink-500">
                {REQUEST_VISIBILITY_HELP[selectedRequest.visibilityScope]}
              </p>
            </div>

            <div className="space-y-2 rounded-card border border-mist-200 bg-mist-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Requester</p>
              <p className="text-sm text-ink-700">
                {selectedRequest.createdBy.name ?? selectedRequest.createdBy.email}
              </p>
            </div>

            {selectedRequest.details && typeof selectedRequest.details === "object" ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Details</p>
                {"preferredTimeWindow" in selectedRequest.details ? (
                  <p className="text-sm text-ink-700">
                    Preferred time window: {String((selectedRequest.details as any).preferredTimeWindow)}
                  </p>
                ) : null}
                {"notes" in selectedRequest.details && (selectedRequest.details as any).notes ? (
                  <p className="text-sm text-ink-700">
                    Notes: {String((selectedRequest.details as any).notes)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
