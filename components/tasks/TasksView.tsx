"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HandHeartIcon } from "@/components/icons/ParishIcons";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import TaskCreateDialog from "@/components/tasks/TaskCreateDialog";
import TaskFilters from "@/components/tasks/TaskFilters";
import TasksEmptyState from "@/components/tasks/TasksEmptyState";
import TasksList from "@/components/tasks/TasksList";
import { Drawer } from "@/components/ui/Drawer";
import EmptyState from "@/components/ui/EmptyState";
import PageHeaderCard from "@/components/layout/PageHeaderCard";
import SectionCard from "@/components/layout/SectionCard";
import type { TaskFilters as TaskFiltersState, TaskListItem, TaskListSummary } from "@/lib/queries/tasks";
import type { PendingAccessRequest } from "@/lib/queries/access";
import type { PendingTaskApproval } from "@/lib/queries/tasks";
import { approveTask, rejectTask } from "@/server/actions/tasks";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";

type TasksViewProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  weekLabel: string;
  weekRange: string;
  weekId: string;
  tasks: TaskListItem[];
  summary: TaskListSummary;
  filteredCount: number;
  filters: TaskFiltersState;
  groupOptions: Array<{ id: string; name: string }>;
  memberOptions: Array<{ id: string; name: string }>;
  currentUserId: string;
  pendingAccessRequests: PendingAccessRequest[];
  pendingTaskApprovals: PendingTaskApproval[];
  approveAccessAction: (formData: FormData) => Promise<void>;
  rejectAccessAction: (formData: FormData) => Promise<void>;
  viewMode?: "all" | "opportunities" | "mine";
  canManageTasks?: boolean;
};

export default function TasksView({
  title = "Serve",
  description,
  ctaLabel = "New serve item",
  weekLabel,
  weekRange,
  weekId,
  tasks,
  summary,
  filteredCount,
  filters,
  groupOptions,
  memberOptions,
  currentUserId,
  pendingAccessRequests,
  pendingTaskApprovals,
  approveAccessAction,
  rejectAccessAction,
  viewMode = "all",
  canManageTasks = true
}: TasksViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [accessRoles, setAccessRoles] = useState<Record<string, string>>({});
  const [isApproving, startApprovalTransition] = useTransition();
  const [isAccessPending, startAccessTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const createParam = searchParams?.get("create");
  const hasTasks = summary.total > 0;
  const hasMatches = filteredCount > 0;

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("status");
    params.delete("owner");
    params.delete("group");
    params.delete("q");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const closeCreateDialog = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (params.has("create")) {
      params.delete("create");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
    setIsCreateOpen(false);
  };

  const statsLabel = useMemo(() => {
    const inProgressLabel = summary.inProgress ? ` · ${summary.inProgress} in progress` : "";
    return `${summary.open} open${inProgressLabel} · ${summary.done} done`;
  }, [summary.done, summary.inProgress, summary.open]);

  const handleApproveTask = (taskId: string) => {
    startApprovalTransition(async () => {
      await approveTask({ taskId });
      router.refresh();
    });
  };

  const handleRejectTask = (taskId: string) => {
    startApprovalTransition(async () => {
      await rejectTask({ taskId });
      router.refresh();
    });
  };

  const handleApproveAccess = (request: PendingAccessRequest) => {
    const role = accessRoles[request.id];
    if (!role) {
      return;
    }
    const formData = new FormData();
    formData.set("parishId", request.parishId);
    formData.set("userId", request.userId);
    formData.set("role", role);
    startAccessTransition(async () => {
      await approveAccessAction(formData);
      router.refresh();
    });
  };

  const handleRejectAccess = (request: PendingAccessRequest) => {
    const formData = new FormData();
    formData.set("parishId", request.parishId);
    formData.set("userId", request.userId);
    startAccessTransition(async () => {
      await rejectAccessAction(formData);
      router.refresh();
    });
  };

  const headingDescription =
    description ??
    (viewMode === "opportunities"
      ? `Browse open ways to serve and support the parish. ${weekRange}`
      : `Keep the week grounded with the next faithful steps. ${weekRange}`);

  const resolvedTitle =
    viewMode === "opportunities"
      ? "Opportunities to Help"
      : viewMode === "mine"
        ? "My commitments"
        : title;
  const showCreateButton = canManageTasks || viewMode === "mine";

  useEffect(() => {
    if (createParam === "task" && showCreateButton) {
      setIsCreateOpen(true);
    }
  }, [createParam, showCreateButton]);

  const handleViewChange = (nextView: "opportunities" | "mine" | "all") => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (nextView === "all") {
      params.delete("view");
    } else {
      params.set("view", nextView);
    }
    if (nextView === "opportunities") {
      params.delete("owner");
      if (params.get("status") === "done") {
        params.delete("status");
      }
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="section-gap">
      <PageHeaderCard
        title={resolvedTitle}
        description={headingDescription}
        badge={
          <span className="rounded-full bg-mist-100 px-3 py-1 text-xs font-medium text-ink-700">
            Week {weekLabel}
          </span>
        }
        actions={
          <>
            <div className="rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-ink-400">Progress</p>
              <p className="text-sm font-semibold text-ink-700">{statsLabel}</p>
            </div>
            {showCreateButton ? (
              <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
                {ctaLabel}
              </Button>
            ) : null}
          </>
        }
      />

      <SectionCard
        title="Filters"
        description={
          viewMode === "opportunities"
            ? "Refine the opportunities you want to see."
            : "Narrow the list to the serve items that need your attention."
        }
        icon={<HandHeartIcon className="h-5 w-5" />}
        iconClassName="bg-rose-100 text-rose-700"
        action={
          viewMode !== "all" ? (
            <div className="inline-flex w-full justify-between rounded-full border border-mist-200 bg-mist-50 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => handleViewChange("opportunities")}
                className={`min-h-[44px] flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                  viewMode === "opportunities"
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                }`}
              >
                Opportunities
              </button>
              <button
                type="button"
                onClick={() => handleViewChange("mine")}
                className={`min-h-[44px] flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                  viewMode === "mine"
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                }`}
              >
                My commitments
              </button>
            </div>
          ) : null
        }
      >
        {isDesktop ? (
          <TaskFilters
            filters={filters}
            groupOptions={groupOptions}
            showOwnership={viewMode !== "opportunities"}
            searchPlaceholder={viewMode === "opportunities" ? "Search opportunities" : undefined}
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFiltersOpen(true)}
            className="w-full"
          >
            Filters
          </Button>
        )}
      </SectionCard>

      {pendingAccessRequests.length ? (
        <SectionCard title="Access approvals" description="Review pending parish access requests.">
          <div className="space-y-3">
            {pendingAccessRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mist-200 bg-mist-50 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-ink-800">
                    {request.userName ?? "Parishioner"}
                  </div>
                  <div className="text-xs text-ink-500">{request.userEmail}</div>
                  <div className="text-xs text-ink-400">{request.parishName}</div>
                </div>
                <div className="text-xs text-ink-400">
                  Requested{" "}
                  {request.requestedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC"
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    name={`role-${request.id}`}
                    value={accessRoles[request.id] ?? ""}
                    onChange={(event) =>
                      setAccessRoles((prev) => ({
                        ...prev,
                        [request.id]: event.target.value
                      }))
                    }
                    className="w-[160px]"
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    <option value="MEMBER">Parishioner</option>
                    <option value="SHEPHERD">Clergy</option>
                    <option value="ADMIN">Admin</option>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApproveAccess(request)}
                    disabled={!accessRoles[request.id] || isAccessPending}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRejectAccess(request)}
                    disabled={isAccessPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {pendingTaskApprovals.length ? (
        <SectionCard
          title="Pending task approvals"
          description="Review member-submitted public tasks before they go live."
        >
          <div className="space-y-3">
            {pendingTaskApprovals.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-amber-200 bg-amber-50/60 px-3 py-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium text-ink-800">{task.title}</div>
                  {task.notes ? (
                    <div className="text-xs text-ink-500">{task.notes}</div>
                  ) : null}
                  <div className="text-xs text-ink-400">
                    Created by {task.createdBy.name} · Assigned to{" "}
                    {task.owner?.name ?? "Unassigned"}
                    {task.group ? ` · ${task.group.name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApproveTask(task.id)}
                    disabled={isApproving}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRejectTask(task.id)}
                    disabled={isApproving}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Serve list"
        description={`${filteredCount} items shown`}
        action={
          hasTasks ? <p className="text-xs text-ink-400">Total this week: {summary.total}</p> : null
        }
        icon={<HandHeartIcon className="h-5 w-5" />}
        iconClassName="bg-rose-100 text-rose-700"
      >
        {/* Grouped sections reinforce status context while keeping filters and empty states visible. */}
        {!hasTasks ? (
          viewMode === "opportunities" ? (
            <EmptyState
              title="No opportunities right now"
              description="Check back soon for new ways to serve."
              action={null}
            />
          ) : (
            <TasksEmptyState
              variant="no-tasks"
              onCreate={showCreateButton ? () => setIsCreateOpen(true) : undefined}
            />
          )
        ) : !hasMatches ? (
          <TasksEmptyState variant="no-matches" onClearFilters={clearFilters} />
        ) : (
          <TasksList
            tasks={tasks}
            groupOptions={groupOptions}
            memberOptions={memberOptions}
            currentUserId={currentUserId}
          />
        )}
      </SectionCard>

      <TaskCreateDialog
        open={isCreateOpen}
        onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreateDialog())}
        weekId={weekId}
        groupOptions={groupOptions}
        memberOptions={memberOptions}
        currentUserId={currentUserId}
      />

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <TaskFilters
          filters={filters}
          groupOptions={groupOptions}
          showOwnership={viewMode !== "opportunities"}
          searchPlaceholder={viewMode === "opportunities" ? "Search opportunities" : undefined}
        />
      </Drawer>
    </div>
  );
}
