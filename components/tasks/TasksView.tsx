"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import TaskCreateDialog from "@/components/tasks/TaskCreateDialog";
import TaskFilters from "@/components/tasks/TaskFilters";
import TasksEmptyState from "@/components/tasks/TasksEmptyState";
import TasksList from "@/components/tasks/TasksList";
import QuoteCard from "@/components/app/QuoteCard";
import DailyQuoteGate from "@/components/app/DailyQuoteGate";
import type { TaskFilters as TaskFiltersState, TaskListItem, TaskListSummary } from "@/lib/queries/tasks";
import type { PendingAccessRequest } from "@/lib/queries/access";
import type { PendingTaskApproval, PendingTaskRequest } from "@/lib/queries/tasks";
import { approveTask, rejectTask } from "@/server/actions/tasks";
import TaskQuickAdd from "@/components/tasks/TaskQuickAdd";
import HeaderActionBar from "@/components/shared/HeaderActionBar";
import PendingRequestsSection from "@/components/shared/PendingRequestsSection";
import { Drawer } from "@/components/ui/Drawer";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { routes } from "@/lib/navigation/routes";
import { useTranslations } from "@/lib/i18n/provider";
import { getOwnerParamForViewChange, shouldShowOwnershipFilter, shouldShowParishionerAddButton } from "@/lib/tasks/serveView";

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
  pendingMyTaskRequests: PendingTaskRequest[];
  approveAccessAction: (formData: FormData) => Promise<void>;
  rejectAccessAction: (formData: FormData) => Promise<void>;
  viewMode?: "all" | "opportunities" | "mine";
  canManageTasks?: boolean;
  canAccessLeaderBoard?: boolean;
  showGroupFilterHint?: boolean;
  canRequestContentCreate?: boolean;
};

export default function TasksView({
  ctaLabel = "New serve item",
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
  pendingMyTaskRequests,
  approveAccessAction,
  rejectAccessAction,
  viewMode = "all",
  canManageTasks = true,
  canAccessLeaderBoard = false,
  showGroupFilterHint = false,
  canRequestContentCreate = false
}: TasksViewProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [accessRoles, setAccessRoles] = useState<Record<string, string>>({});
  const [isApproving, startApprovalTransition] = useTransition();
  const [isAccessPending, startAccessTransition] = useTransition();

  const createParam = searchParams?.get("create");
  const hasTasks = summary.total > 0;
  const hasMatches = filteredCount > 0;
  const showCreateButton = canManageTasks || viewMode === "mine";
  const isMyCommitmentsView = viewMode === "mine";
  const isParishionerMyCommitments = !canManageTasks && isMyCommitmentsView;
  const showOwnershipFilter = shouldShowOwnershipFilter(viewMode);
  const showParishionerAddButton = shouldShowParishionerAddButton({
    canManageTasks,
    canRequestContentCreate,
    viewMode
  });
  const [showCommitmentsInfo, setShowCommitmentsInfo] = useState(false);

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

  const pendingTaskRequestItems = useMemo(
    () =>
      pendingTaskApprovals.map((task) => ({
        id: task.id,
        title: task.title,
        description: `by ${task.createdBy.name} · ${task.owner?.name ?? "Unassigned"}${task.group ? ` · ${task.group.name}` : ""}`
      })),
    [pendingTaskApprovals]
  );

  const pendingOwnTaskRequestItems = useMemo(
    () =>
      pendingMyTaskRequests.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.group ? `Group: ${task.group.name}` : "Awaiting leader review"
      })),
    [pendingMyTaskRequests]
  );

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
    const nextOwner = getOwnerParamForViewChange({
      currentOwner: params.get("owner"),
      nextView
    });

    if (nextOwner) {
      params.set("owner", nextOwner);
    } else {
      params.delete("owner");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
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
        return <TasksEmptyState variant="no-opportunities" />;
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
        isMyCommitmentsContext={!canManageTasks && viewMode === "mine"}
      />
    );
  };

  /* ─── Unified layout — same flow for leaders and parishioners ─── */
  return (
    <div className="section-gap">
      <DailyQuoteGate storageKey="serve.quote.daily">
        <QuoteCard
          quote={t("serve.quote")}
          source={t("serve.quoteSource")}
          tone="sky"
        />
      </DailyQuoteGate>

      {/* Controls: toggle + actions — single compact row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {renderViewToggle()}

        <HeaderActionBar
          onFilterClick={() => setFiltersOpen(true)}
          filterActive={filters.status !== "all" || (!isMyCommitmentsView && filters.ownership !== "all") || Boolean(filters.groupId) || Boolean(filters.query) || Boolean(filters.dateFrom) || Boolean(filters.dateTo)}
          left={
            canAccessLeaderBoard ? (
              <Link
                href={routes.serveBoard}
                className="inline-flex h-11 max-w-[170px] shrink-0 items-center rounded-full border border-mist-200 bg-white px-3 text-xs font-semibold text-ink-700 transition hover:bg-mist-50 sm:max-w-none"
              >
                <span className="truncate">{t("tasks.leaderBoard.cta")}</span>
              </Link>
            ) : null
          }
          onAddClick={
            showParishionerAddButton
              ? () => (canManageTasks ? setIsCreateOpen(true) : setIsRequestOpen(true))
              : undefined
          }
          addLabel={canManageTasks ? ctaLabel : t("serve.requestOpportunity")}
        />

        {isParishionerMyCommitments ? (
          <div className="flex items-start gap-2 rounded-lg border border-mist-200 bg-white/80 px-3 py-2 text-xs text-ink-600">
            <p>{t("tasks.myCommitmentsHint.short")}</p>
            <button
              type="button"
              onClick={() => setShowCommitmentsInfo((prev) => !prev)}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-mist-300 text-[11px] font-semibold text-ink-500 transition hover:border-mist-400 hover:text-ink-700"
              aria-label={t("tasks.myCommitmentsHint.infoLabel")}
              aria-expanded={showCommitmentsInfo}
            >
              ?
            </button>
          </div>
        ) : null}

        {isParishionerMyCommitments && showCommitmentsInfo ? (
          <div className="rounded-lg border border-primary-100 bg-primary-50/70 px-3 py-2 text-xs text-primary-800">
            {t("tasks.myCommitmentsHint.detail")}
          </div>
        ) : null}

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

      {/* Mobile filter drawer */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("tasks.filters.title")}
      >
        <div className="space-y-4">
          <div className="rounded-xl border-l-4 border-l-sky-400 bg-sky-50/60 px-4 py-3">
            <p className="text-xs text-sky-700">{t("tasks.filters.tip")}</p>
          </div>
          {renderViewToggle()}
          <TaskFilters
            filters={filters}
            groupOptions={groupOptions}
            showOwnership={showOwnershipFilter}
            showGroup={canManageTasks || viewMode !== "mine"}
            layout="stacked"
            searchPlaceholder={
              viewMode === "opportunities" ? t("tasks.filters.searchOpportunities") : undefined
            }
            groupDisabledHint={showGroupFilterHint ? "Join a group to filter" : undefined}
          />
        </div>
      </Drawer>

      {/* Inline filters (desktop only) */}
      <div className="hidden md:block">
        <TaskFilters
          filters={filters}
          groupOptions={groupOptions}
          showOwnership={showOwnershipFilter}
          showGroup={canManageTasks || viewMode !== "mine"}
          layout="inline"
          searchPlaceholder={
            viewMode === "opportunities" ? t("tasks.filters.searchOpportunities") : undefined
          }
          groupDisabledHint={showGroupFilterHint ? "Join a group to filter" : undefined}
        />
      </div>

            <PendingRequestsSection
        entityType="SERVE_TASK"
        items={canManageTasks ? pendingTaskRequestItems : pendingOwnTaskRequestItems}
        canManage={canManageTasks}
        busyId={canManageTasks && isApproving ? "*" : null}
        onApprove={(id) => handleApproveTask(id)}
        onDecline={(id) => handleRejectTask(id)}
      />

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
      {(canManageTasks || viewMode === "mine") && viewMode !== "opportunities" && (
        <TaskQuickAdd weekId={weekId} creationContext={viewMode === "mine" ? "my_commitments" : "default"} />
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
        initialVisibility="private"
        forcePrivate={!canManageTasks && viewMode === "mine"}
        creationContext={!canManageTasks && viewMode === "mine" ? "my_commitments" : "default"}
      />


      <TaskCreateDialog
        open={isRequestOpen}
        onOpenChange={setIsRequestOpen}
        weekId={weekId}
        groupOptions={groupOptions}
        memberOptions={memberOptions}
        currentUserId={currentUserId}
        initialVisibility="public"
        forcePublic
        requestMode
      />
    </div>
  );
}
