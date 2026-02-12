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
import { useTranslations } from "@/lib/i18n/provider";

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
  canAccessLeaderBoard?: boolean;
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
  canManageTasks = true,
  canAccessLeaderBoard = false
}: TasksViewProps) {
  const t = useTranslations();
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
        { value: "all" as const, label: t("tasks.view.all") },
        { value: "opportunities" as const, label: t("tasks.view.opportunities") },
        { value: "mine" as const, label: t("tasks.view.myCommitments") }
      ]
    : [
        { value: "opportunities" as const, label: t("tasks.view.opportunities") },
        { value: "mine" as const, label: t("tasks.view.myCommitments") }
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
          className={`min-h-[36px] flex-1 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition ${
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
            title={t("thisWeek.noOpportunities")}
            description={t("thisWeek.noOpportunitiesHint")}
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
        quote={t("serve.quote")}
        source={t("serve.quoteSource")}
        tone="sky"
      />

      {canAccessLeaderBoard ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-sky-800">{t("tasks.leaderBoard.helper")}</p>
            <Link
              href={routes.serveBoard}
              className="inline-flex min-h-[36px] items-center rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              {t("tasks.leaderBoard.cta")}
            </Link>
          </div>
        </div>
      ) : null}

      {/* Controls: toggle + actions — single compact row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {renderViewToggle()}

        {/* + create (circle on mobile, button on desktop) */}
        {(canManageTasks || (showCreateButton && viewMode !== "opportunities")) && (
          <>
            <button
              type="button"
              onClick={() =>
                canManageTasks
                  ? setIsCreateOpen(true)
                  : openCreateDialogWithVisibility("private")
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 sm:hidden"
              aria-label={canManageTasks ? ctaLabel : t("thisWeek.addTaskAria")}
            >
              <PlusIcon />
            </button>
            <Button
              type="button"
              onClick={() =>
                canManageTasks
                  ? setIsCreateOpen(true)
                  : openCreateDialogWithVisibility("private")
              }
              className="hidden h-9 px-3 text-sm sm:inline-flex"
            >
              {canManageTasks ? ctaLabel : t("thisWeek.addPrivateTask")}
            </Button>
            {!canManageTasks && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => openCreateDialogWithVisibility("public")}
                className="hidden h-9 px-3 text-sm sm:inline-flex"
              >
                {t("thisWeek.requestPublicTask")}
              </Button>
            )}
          </>
        )}

        {/* Filters drawer (mobile only) */}
        <div className="md:hidden">
          <FiltersDrawer title={t("tasks.filters.title")} className="shrink-0">
            <div className="space-y-4">
              <div className="rounded-xl border-l-4 border-l-sky-400 bg-sky-50/60 px-4 py-3">
                <p className="text-xs text-sky-700">{t("tasks.filters.tip")}</p>
              </div>
              {renderViewToggle()}
              <TaskFilters
                filters={filters}
                groupOptions={groupOptions}
                showOwnership={viewMode !== "opportunities"}
                layout="stacked"
                searchPlaceholder={
                  viewMode === "opportunities" ? t("tasks.filters.searchOpportunities") : undefined
                }
              />
            </div>
          </FiltersDrawer>
        </div>

        {/* Hours & Gratitude Board — desktop only */}
        {canManageTasks && (
          <Link
            href={routes.gratitudeBoard}
            className="hidden rounded-full border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-mist-50 sm:inline-flex"
          >
            {t("tasks.hoursBoard")}
          </Link>
        )}
      </div>

      {/* Inline filters (desktop only) */}
      <div className="hidden md:block">
        <TaskFilters
          filters={filters}
          groupOptions={groupOptions}
          showOwnership={viewMode !== "opportunities"}
          layout="inline"
          searchPlaceholder={
            viewMode === "opportunities" ? t("tasks.filters.searchOpportunities") : undefined
          }
        />
      </div>

      {/* Pending approvals — compact banners above the list */}
      {canManageTasks && pendingTaskApprovals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            {t("thisWeek.pendingApprovals")}
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
            {t("thisWeek.accessRequests")}
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
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
                  className="w-full sm:w-[160px]"
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
