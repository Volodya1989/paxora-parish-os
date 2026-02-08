"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RequestDetail } from "@/lib/queries/requests";
import type { RequestStatus, VisibilityScope } from "@prisma/client";
import { Drawer } from "@/components/ui/Drawer";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { formatMessageTime } from "@/lib/time/messageTime";
import FiltersDrawer from "@/components/app/filters-drawer";
import {
  REQUEST_STATUS_ORDER,
  REQUEST_STATUS_TONES,
  REQUEST_VISIBILITY_LABELS,
  REQUEST_VISIBILITY_HELP,
  getRequestStatusLabel,
  getRequestTypeLabel,
  isRequestOverdue
} from "@/lib/requests/utils";
import {
  assignRequest,
  cancelRequest,
  scheduleRequest,
  sendRequestInfoEmailAction,
  updateRequestStatus,
  updateRequestVisibility,
  type RequestActionResult
} from "@/server/actions/requests";
import { parseRequestDetails } from "@/lib/requests/details";

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
  { value: "GENERIC", label: "General request" },
  { value: "LITURGICAL", label: "Liturgical" }
];

const filterVisibility = [
  { value: "", label: "All scopes" },
  { value: "CLERGY_ONLY", label: "Clergy only" },
  { value: "ADMIN_ALL", label: "All clergy + admins" },
  { value: "ADMIN_SPECIFIC", label: "Clergy + assigned" }
];

const filterArchived = [
  { value: "", label: "Active requests" },
  { value: "true", label: "Archived requests" }
];

export type RequestsBoardProps = {
  requests: RequestDetail[];
  assignees: Array<{ id: string; name: string | null; email: string }>;
};

type RequestEmailDialog = "schedule" | "need-info" | "cannot-schedule";

export default function RequestsBoard({ requests, assignees }: RequestsBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [emailDialog, setEmailDialog] = useState<RequestEmailDialog | null>(null);
  const [emailNote, setEmailNote] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [isUpdating, startTransition] = useTransition();
  const [expandedStatuses, setExpandedStatuses] = useState<Record<RequestStatus, boolean>>({
    SUBMITTED: false,
    ACKNOWLEDGED: false,
    SCHEDULED: false,
    COMPLETED: false,
    CANCELED: false
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const requestIdParam = searchParams?.get("requestId") ?? null;

  // Keep the selected request derived from the URL to avoid stale state re-opening the drawer (React #418).
  const selectedId = requestIdParam;
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

  const mobileLimit = 5;
  const collapsedStatuses = new Set<RequestStatus>(["COMPLETED", "CANCELED"]);

  const toggleStatusExpansion = (status: RequestStatus) => {
    setExpandedStatuses((current) => ({
      ...current,
      [status]: !current[status]
    }));
  };

  const openRequest = (requestId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("requestId", requestId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const closeRequest = () => {
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
    if (status === "SCHEDULED") {
      openEmailDialog("schedule");
      return;
    }
    if (status === "CANCELED") {
      openEmailDialog("cannot-schedule");
      return;
    }
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

  const requestDetails = parseRequestDetails(selectedRequest?.details ?? null);
  const historyItems = useMemo(() => {
    if (!requestDetails) return [];
    const emailHistory = (requestDetails.history ?? []).map((entry, index) => {
      const typeLabel = (entry.type ?? entry.template ?? "EMAIL").replace(/_/g, " ").toLowerCase();
      const metaParts = [
        typeLabel,
        entry.sentByName ? `Sent by ${entry.sentByName}` : null
      ].filter(Boolean);
      return {
        id: `email-${index}-${entry.sentAt}`,
        title: entry.subject ?? `${typeLabel} email`,
        timestamp: entry.sentAt,
        meta: metaParts.join(" · "),
        note: entry.note
      };
    });
    const activityHistory = (requestDetails.activity ?? []).map((entry, index) => {
      const metaParts = [
        entry.type.replace(/_/g, " ").toLowerCase(),
        entry.actorName ? `By ${entry.actorName}` : null
      ].filter(Boolean);
      return {
        id: `activity-${index}-${entry.occurredAt}`,
        title: entry.description,
        timestamp: entry.occurredAt,
        meta: metaParts.join(" · "),
        note: null as string | null
      };
    });

    return [...emailHistory, ...activityHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [requestDetails]);

  const formatDateInput = (date: Date) => date.toISOString().split("T")[0];
  const formatTimeInput = (date: Date) => date.toTimeString().slice(0, 5);

  const openEmailDialog = (dialog: RequestEmailDialog) => {
    setEmailDialog(dialog);
    setEmailNote("");
    setStatusMessage(null);

    if (dialog === "schedule") {
      const scheduledStart = requestDetails?.schedule?.startsAt
        ? new Date(requestDetails.schedule.startsAt)
        : null;
      const scheduledEnd = requestDetails?.schedule?.endsAt
        ? new Date(requestDetails.schedule.endsAt)
        : null;
      setScheduleDate(scheduledStart ? formatDateInput(scheduledStart) : "");
      setScheduleStartTime(scheduledStart ? formatTimeInput(scheduledStart) : "");
      setScheduleEndTime(scheduledEnd ? formatTimeInput(scheduledEnd) : "");
    } else {
      setScheduleDate("");
      setScheduleStartTime("");
      setScheduleEndTime("");
    }
  };

  const closeEmailDialog = () => {
    setEmailDialog(null);
  };

  const handleSendEmail = () => {
    if (!selectedRequest || !emailDialog) return;
    if (isUpdating || isSendingEmail) return;
    setStatusMessage(null);

    setIsSendingEmail(true);
    startTransition(async () => {
      try {
        let result: RequestActionResult | null = null;
        if (emailDialog === "need-info") {
          result = await sendRequestInfoEmailAction({
            requestId: selectedRequest.id,
            note: emailNote || undefined
          });
        }

        if (emailDialog === "cannot-schedule") {
          result = await cancelRequest({
            requestId: selectedRequest.id,
            note: emailNote || undefined
          });
        }

        if (emailDialog === "schedule") {
          result = await scheduleRequest({
            requestId: selectedRequest.id,
            date: scheduleDate,
            startTime: scheduleStartTime,
            endTime: scheduleEndTime,
            note: emailNote || undefined
          });
        }

        if (result?.status === "error") {
          const message = result.message ?? "Something went wrong.";
          setStatusMessage(message);
          addToast({ title: message, status: "error" });
          return;
        }

        closeEmailDialog();
        router.refresh();
        if (result) {
          const message = result.message ?? "Email sent.";
          const status = message.toLowerCase().includes("failed") ? "warning" : "success";
          addToast({ title: message, status });
        }
      } finally {
        setIsSendingEmail(false);
      }
    });
  };

  const emailDialogTitle =
    emailDialog === "schedule"
      ? "Schedule request"
      : emailDialog === "need-info"
        ? "Need more info"
        : emailDialog === "cannot-schedule"
          ? "Cannot schedule"
          : "";
  const detailOpen = Boolean(selectedRequest) && !emailDialog;

  const filterControls = (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
      <SelectMenu
        value={searchParams?.get("archived") ?? ""}
        onValueChange={(value) => updateFilter("archived", value)}
        options={filterArchived}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <FiltersDrawer title="Filters">
          <div className="space-y-3">{filterControls}</div>
        </FiltersDrawer>
      </div>

      <div className="hidden md:block">{filterControls}</div>

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
                <>
                  <div className="space-y-2 md:hidden">
                    {(() => {
                      const isCollapsed = collapsedStatuses.has(group.status);
                      const isExpanded = expandedStatuses[group.status];
                      const visibleItems = isExpanded
                        ? group.items
                        : group.items.slice(0, isCollapsed ? 0 : mobileLimit);
                      return visibleItems.map((request) => (
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
                              {getRequestTypeLabel(request.type)} · Updated{" "}
                              {formatMessageTime(request.updatedAt)}
                            </div>
                            {request.assignedTo?.name ? (
                              <div className="text-xs text-ink-500">
                                Assigned to {request.assignedTo.name}
                              </div>
                            ) : (
                              <div className="text-xs text-ink-400">Unassigned</div>
                            )}
                            {overdueLabel(request) ? <Badge tone="warning">Overdue</Badge> : null}
                          </Card>
                        </button>
                      ));
                    })()}
                    {(() => {
                      const isCollapsed = collapsedStatuses.has(group.status);
                      const isExpanded = expandedStatuses[group.status];
                      const limit = isCollapsed ? 0 : mobileLimit;
                      const hasMore = group.items.length > limit;
                      if (!hasMore) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => toggleStatusExpansion(group.status)}
                          className="text-xs font-semibold text-primary-700"
                        >
                          {isExpanded ? "Show less" : "Show more"} ({group.items.length})
                        </button>
                      );
                    })()}
                  </div>
                  <div className="hidden space-y-2 md:block">
                    {group.items.map((request) => (
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
                            {getRequestTypeLabel(request.type)} · Updated{" "}
                            {formatMessageTime(request.updatedAt)}
                          </div>
                          {request.assignedTo?.name ? (
                            <div className="text-xs text-ink-500">
                              Assigned to {request.assignedTo.name}
                            </div>
                          ) : (
                            <div className="text-xs text-ink-400">Unassigned</div>
                          )}
                          {overdueLabel(request) ? <Badge tone="warning">Overdue</Badge> : null}
                        </Card>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Drawer
        open={detailOpen}
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
                {requestDetails?.requesterName ?? selectedRequest.createdBy.name ?? "Parishioner"}
              </p>
              <p className="text-xs text-ink-500">
                {requestDetails?.requesterEmail ?? selectedRequest.createdBy.email}
              </p>
              {requestDetails?.requesterPhone ? (
                <p className="text-xs text-ink-500">{requestDetails.requesterPhone}</p>
              ) : null}
            </div>

            {requestDetails ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Details</p>
                {requestDetails.description || requestDetails.notes ? (
                  <p className="text-sm text-ink-700">
                    {requestDetails.description ?? requestDetails.notes}
                  </p>
                ) : null}
                {requestDetails.preferredTimeWindow ? (
                  <p className="text-sm text-ink-700">
                    Preferred time window: {requestDetails.preferredTimeWindow}
                  </p>
                ) : null}
                {requestDetails.schedule?.startsAt ? (
                  <p className="text-sm text-ink-700">
                    Proposed schedule:{" "}
                    {new Date(requestDetails.schedule.startsAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Send email</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openEmailDialog("schedule")}
                >
                  Schedule request
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openEmailDialog("need-info")}
                >
                  Need more info
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openEmailDialog("cannot-schedule")}
                >
                  Cannot schedule
                </Button>
              </div>
            </div>

            {historyItems.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">History</p>
                <div className="space-y-2">
                  {historyItems.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-card border border-mist-200 bg-white px-3 py-2 text-xs text-ink-600"
                    >
                      <p className="font-semibold text-ink-700">{entry.title}</p>
                      <p className="text-[11px] text-ink-400">
                        {new Date(entry.timestamp).toLocaleString()}
                        {entry.meta ? ` · ${entry.meta}` : ""}
                      </p>
                      {entry.note ? (
                        <p className="mt-1 text-[11px] text-ink-500">{entry.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
      <Modal open={detailOpen} onClose={closeRequest} title="Request details">
        {selectedRequest ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink-900">{selectedRequest.title}</h2>
              <p className="text-sm text-ink-500">
                {getRequestTypeLabel(selectedRequest.type)} · Updated{" "}
                {formatMessageTime(selectedRequest.updatedAt)}
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
                {requestDetails?.requesterName ?? selectedRequest.createdBy.name ?? "Parishioner"}
              </p>
              <p className="text-xs text-ink-500">
                {requestDetails?.requesterEmail ?? selectedRequest.createdBy.email}
              </p>
              {requestDetails?.requesterPhone ? (
                <p className="text-xs text-ink-500">{requestDetails.requesterPhone}</p>
              ) : null}
            </div>

            {requestDetails ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Details</p>
                {requestDetails.description || requestDetails.notes ? (
                  <p className="text-sm text-ink-700">
                    {requestDetails.description ?? requestDetails.notes}
                  </p>
                ) : null}
                {requestDetails.preferredTimeWindow ? (
                  <p className="text-sm text-ink-700">
                    Preferred time window: {requestDetails.preferredTimeWindow}
                  </p>
                ) : null}
                {requestDetails.schedule?.startsAt ? (
                  <p className="text-sm text-ink-700">
                    Proposed schedule:{" "}
                    {new Date(requestDetails.schedule.startsAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Send email</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openEmailDialog("schedule")}
                >
                  Schedule request
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openEmailDialog("need-info")}
                >
                  Need more info
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openEmailDialog("cannot-schedule")}
                >
                  Cannot schedule
                </Button>
              </div>
            </div>

            {historyItems.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">History</p>
                <div className="space-y-2">
                  {historyItems.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-card border border-mist-200 bg-white px-3 py-2 text-xs text-ink-600"
                    >
                      <p className="font-semibold text-ink-700">{entry.title}</p>
                      <p className="text-[11px] text-ink-400">
                        {new Date(entry.timestamp).toLocaleString()}
                        {entry.meta ? ` · ${entry.meta}` : ""}
                      </p>
                      {entry.note ? (
                        <p className="mt-1 text-[11px] text-ink-500">{entry.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(emailDialog)}
        onClose={closeEmailDialog}
        title={emailDialogTitle}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={closeEmailDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSendEmail} isLoading={isUpdating || isSendingEmail}>
              Send email
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {statusMessage ? (
            <div className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {statusMessage}
            </div>
          ) : null}
          {emailDialog === "schedule" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-700" htmlFor="schedule-date">
                  Date
                </label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(event) => setScheduleDate(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink-700" htmlFor="schedule-start">
                    Start time
                  </label>
                  <Input
                    id="schedule-start"
                    type="time"
                    value={scheduleStartTime}
                    onChange={(event) => setScheduleStartTime(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink-700" htmlFor="schedule-end">
                    End time
                  </label>
                  <Input
                    id="schedule-end"
                    type="time"
                    value={scheduleEndTime}
                    onChange={(event) => setScheduleEndTime(event.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : null}

          {emailDialog === "need-info" ? (
            <p className="text-sm text-ink-600">
              This email asks the requester to call the office for more details.
            </p>
          ) : null}
          {emailDialog === "cannot-schedule" ? (
            <p className="text-sm text-ink-600">
              This will mark the request as canceled and ask the requester to call the office.
            </p>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="email-note">
              Note (optional)
            </label>
            <Textarea
              id="email-note"
              rows={3}
              placeholder="Add a short note for the requester"
              value={emailNote}
              onChange={(event) => setEmailNote(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Drawer
        open={Boolean(emailDialog)}
        onClose={closeEmailDialog}
        title={emailDialogTitle}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={closeEmailDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSendEmail} isLoading={isUpdating || isSendingEmail}>
              Send email
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {statusMessage ? (
            <div className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {statusMessage}
            </div>
          ) : null}
          {emailDialog === "schedule" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-700" htmlFor="schedule-date-mobile">
                  Date
                </label>
                <Input
                  id="schedule-date-mobile"
                  type="date"
                  value={scheduleDate}
                  onChange={(event) => setScheduleDate(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-ink-700"
                    htmlFor="schedule-start-mobile"
                  >
                    Start time
                  </label>
                  <Input
                    id="schedule-start-mobile"
                    type="time"
                    value={scheduleStartTime}
                    onChange={(event) => setScheduleStartTime(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-ink-700"
                    htmlFor="schedule-end-mobile"
                  >
                    End time
                  </label>
                  <Input
                    id="schedule-end-mobile"
                    type="time"
                    value={scheduleEndTime}
                    onChange={(event) => setScheduleEndTime(event.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : null}

          {emailDialog === "need-info" ? (
            <p className="text-sm text-ink-600">
              This email asks the requester to call the office for more details.
            </p>
          ) : null}
          {emailDialog === "cannot-schedule" ? (
            <p className="text-sm text-ink-600">
              This will mark the request as canceled and ask the requester to call the office.
            </p>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="email-note-mobile">
              Note (optional)
            </label>
            <Textarea
              id="email-note-mobile"
              rows={3}
              placeholder="Add a short note for the requester"
              value={emailNote}
              onChange={(event) => setEmailNote(event.target.value)}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
