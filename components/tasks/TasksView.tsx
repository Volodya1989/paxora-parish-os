"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import TaskCreateDialog from "@/components/tasks/TaskCreateDialog";
import TaskFilters from "@/components/tasks/TaskFilters";
import TasksEmptyState from "@/components/tasks/TasksEmptyState";
import TasksList from "@/components/tasks/TasksList";
import FiltersDrawer from "@/components/app/filters-drawer";
import ListEmptyState from "@/components/app/list-empty-state";
import QuoteCard from "@/components/app/QuoteCard";
import type { TaskFilters as TaskFiltersState, TaskListItem, TaskListSummary } from "@/lib/queries/tasks";
import type { PendingAccessRequest } from "@/lib/queries/access";
import type { PendingTaskApproval } from "@/lib/queries/tasks";
import { approveTask, rejectTask } from "@/server/actions/tasks";
import TaskQuickAdd from "@/components/tasks/TaskQuickAdd";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { routes } from "@/lib/navigation/routes";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

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
  memberOptions: Array<{ id: string; name: string; label?: string }>;
  currentUserId: string;
  pendingAccessRequests: PendingAccessRequest[];
  pendingTaskApprovals: PendingTaskApproval[];
  approveAccessAction: (formData: FormData) => Promise<void>;
  rejectAccessAction: (formData: FormData) => Promise<void>;
  viewMode?: "all" | "opportunities" | "mine";
  canManageTasks?: boolean;
};

export default function TasksView({
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
  const [createVisibility, setCreateVisibility] = useState<"private" | "public">("private");
  const [accessRoles, setAccessRoles] = useState<Record<string, string>>({});
  const [isApproving, startApprovalTransition] = useTransition();
  const [isAccessPending, startAccessTransition] = useTransition();

  const createParam = searchParams?.get("create");
  const hasTasks = summary.total > 0;
  const hasMatches = filteredCount > 0;
  const showCreateButton = canManageTasks || viewMode === "mine";

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
    if (!role) return;
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

  const openCreateDialogWithVisibility = (visibility: "private" | "public") => {
    setCreateVisibility(visibility);
    setIsCreateOpen(true);
  };

  useEffect(() => {
    if (createParam === "task" && showCreateButton) {
      setIsCreateOpen(true);
    }
  }, [createParam, showCreateButton]);

  /* ─── View toggle (unified for both roles) ─── */
  const viewOptions = canManageTasks
    ? [
        { value: "all" as const, label: "All" },
        { value: "opportunities" as const, label: "Opportunities" },
        { value: "mine" as const, label: "My commitments" }
      ]
    : [
        { value: "opportunities" as const, label: "Opportunities" },
        { value: "mine" as const, label: "My commitments" }
      ];

  const renderViewToggle = (className?: string) => (
    <div
      className={cn(
        "inline-flex w-full justify-between rounded-full border border-mist-200 bg-mist-50 p-1 sm:w-auto",
        className
      )}
    >
      {viewOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleViewChange(option.value)}
          className={`min-h-[36px] flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
            viewMode === option.value
              ? "bg-white text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  /* ─── Task list content ─── */
  const renderTasksContent = () => {
    if (!hasTasks) {
      if (viewMode === "opportunities") {
        return (
          <ListEmptyState
            title="No opportunities right now"
            description="Check back soon for new ways to serve."
          />
        );
      }
      return (
        <TasksEmptyState
          variant="no-tasks"
          onCreate={showCreateButton ? () => setIsCreateOpen(true) : undefined}
        />
      );
    }

    if (!hasMatches) {
      return <TasksEmptyState variant="no-matches" onClearFilters={clearFilters} />;
    }

    return (
      <TasksList
        tasks={tasks}
        groupOptions={groupOptions}
        memberOptions={memberOptions}
        currentUserId={currentUserId}
      />
    );
  };

  /* ─── Unified layout — same flow for leaders and parishioners ─── */
  return (
    <div className="section-gap">
      <QuoteCard
        quote="Each of you should use whatever gift you have received to serve others."
        source="1 Peter 4:10"
        tone="sky"
      />

      {/* Controls row: toggle + stats + actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {renderViewToggle("flex-1 min-w-[220px] sm:flex-none")}

          {/* Stats — subtle inline text */}
          {hasTasks && (
            <span className="text-xs text-ink-400">{statsLabel}</span>
          )}

          <div className="md:hidden">
            <FiltersDrawer title="Filters" className="shrink-0">
              <div className="space-y-4">
                {renderViewToggle()}
                <TaskFilters
                  filters={filters}
                  groupOptions={groupOptions}
                  showOwnership={viewMode !== "opportunities"}
                  layout="stacked"
                  searchPlaceholder={viewMode === "opportunities" ? "Search opportunities" : undefined}
                />
              </div>
            </FiltersDrawer>
          </div>
        </div>

        {/* Action buttons: + icon on mobile, full text on desktop */}
        <div className="flex flex-wrap items-center gap-2">
          {canManageTasks && viewMode !== "opportunities" && (
            <>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 sm:hidden"
                aria-label={ctaLabel}
              >
                <PlusIcon />
              </button>
              <Button onClick={() => setIsCreateOpen(true)} className="hidden h-9 px-3 text-sm sm:inline-flex">
                {ctaLabel}
              </Button>
            </>
          )}
          {!canManageTasks && viewMode === "mine" && (
            <>
              <button
                type="button"
                onClick={() => openCreateDialogWithVisibility("private")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 sm:hidden"
                aria-label="Add a private task"
              >
                <PlusIcon />
              </button>
              <Button
                type="button"
                onClick={() => openCreateDialogWithVisibility("private")}
                className="hidden h-9 px-3 text-sm sm:inline-flex"
              >
                Add a private task
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => openCreateDialogWithVisibility("public")}
                className="hidden h-9 px-3 text-sm sm:inline-flex"
              >
                Request a public task
              </Button>
            </>
          )}
          {canManageTasks && (
            <Link
              href={routes.gratitudeBoard}
              className="rounded-full border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-mist-50"
            >
              Hours &amp; Gratitude Board
            </Link>
          )}
        </div>
      </div>

      {/* Inline filters (desktop) */}
      <div className="hidden md:block">
        <TaskFilters
          filters={filters}
          groupOptions={groupOptions}
          showOwnership={viewMode !== "opportunities"}
          layout="inline"
          searchPlaceholder={viewMode === "opportunities" ? "Search opportunities" : undefined}
        />
      </div>

      {/* Pending approvals — compact banners above the list */}
      {canManageTasks && pendingTaskApprovals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Pending approvals
          </p>
          {pendingTaskApprovals.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 border-amber-200 border-l-amber-400 bg-amber-50/60 px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-semibold text-ink-800">{task.title}</p>
                <p className="text-xs text-ink-500">
                  by {task.createdBy.name} · {task.owner?.name ?? "Unassigned"}
                  {task.group ? ` · ${task.group.name}` : ""}
                </p>
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
      )}

      {canManageTasks && pendingAccessRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Access requests
          </p>
          {pendingAccessRequests.map((request) => (
            <div
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 border-sky-200 border-l-sky-400 bg-sky-50/60 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-800">
                  {request.userName ?? "Parishioner"}
                </p>
                <p className="text-xs text-ink-500">
                  {request.userEmail} · Requested{" "}
                  {request.requestedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC"
                  })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SelectMenu
                  name={`role-${request.id}`}
                  value={accessRoles[request.id] ?? ""}
                  onValueChange={(value) =>
                    setAccessRoles((prev) => ({ ...prev, [request.id]: value }))
                  }
                  placeholder="Select role"
                  options={[
                    { value: "MEMBER", label: "Parishioner" },
                    { value: "SHEPHERD", label: "Clergy" },
                    { value: "ADMIN", label: "Admin" }
                  ]}
                  className="w-[140px]"
                />
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
      )}

      {/* Quick add (admin only, outside of opportunities view) */}
      {canManageTasks && viewMode !== "opportunities" && (
        <TaskQuickAdd weekId={weekId} />
      )}

      {/* Task list summary */}
      {hasTasks && (
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-ink-400">{filteredCount} items shown</p>
          <p className="text-xs text-ink-400">Total this week: {summary.total}</p>
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-5">{renderTasksContent()}</div>

      <TaskCreateDialog
        open={isCreateOpen}
        onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreateDialog())}
        weekId={weekId}
        groupOptions={groupOptions}
        memberOptions={memberOptions}
        currentUserId={currentUserId}
        initialVisibility={createVisibility}
      />
    </div>
  );
}
