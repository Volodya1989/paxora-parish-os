"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HandHeartIcon } from "@/components/icons/ParishIcons";
import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import TaskCreateDialog from "@/components/tasks/TaskCreateDialog";
import TaskFilters from "@/components/tasks/TaskFilters";
import TasksEmptyState from "@/components/tasks/TasksEmptyState";
import TasksList from "@/components/tasks/TasksList";
import PageShell from "@/components/app/page-shell";
import FiltersDrawer from "@/components/app/filters-drawer";
import Card from "@/components/ui/Card";
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
  const [createVisibility, setCreateVisibility] = useState<"private" | "public">("private");
  const [accessRoles, setAccessRoles] = useState<Record<string, string>>({});
  const [isApproving, startApprovalTransition] = useTransition();
  const [isAccessPending, startAccessTransition] = useTransition();

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
      ? `Discover ways to serve the parish. ${weekRange}`
      : viewMode === "mine"
        ? `Your commitments and next steps. ${weekRange}`
        : `Keep the week grounded with faithful steps. ${weekRange}`);

  const resolvedTitle =
    viewMode === "opportunities"
      ? "Opportunities to Help"
      : viewMode === "mine"
        ? "My commitments"
        : title;
  const showCreateButton = canManageTasks || viewMode === "mine";
  const isParishionerView = !canManageTasks;

  const filtersContent = (
    <TaskFilters
      filters={filters}
      groupOptions={groupOptions}
      showOwnership={viewMode !== "opportunities"}
      layout="inline"
      searchPlaceholder={viewMode === "opportunities" ? "Search opportunities" : undefined}
    />
  );

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

  const openCreateDialogWithVisibility = (visibility: "private" | "public") => {
    setCreateVisibility(visibility);
    setIsCreateOpen(true);
  };

  const renderViewToggle = (className?: string) => {
    if (viewMode === "all") {
      return null;
    }
    return (
      <div
        className={cn(
          "inline-flex w-full justify-between rounded-full border border-mist-200 bg-mist-50 p-1 sm:w-auto",
          className
        )}
      >
        <button
          type="button"
          onClick={() => handleViewChange("opportunities")}
          className={`min-h-[36px] flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
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
          className={`min-h-[36px] flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
            viewMode === "mine"
              ? "bg-white text-ink-900 shadow-sm"
              : "text-ink-500 hover:text-ink-700"
          }`}
        >
          My commitments
        </button>
      </div>
    );
  };

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

  if (isParishionerView) {
    return (
      <div className="section-gap">
        <QuoteCard
          quote="Each of you should use whatever gift you have received to serve others."
          source="1 Peter 4:10"
          tone="sky"
        />

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {renderViewToggle("flex-1 min-w-[220px] sm:flex-none")}
            <div className="md:hidden">
              <FiltersDrawer title="Filters" className="shrink-0">
                <div className="space-y-4">
                  {renderViewToggle()}
                  <TaskFilters
                    filters={filters}
                    groupOptions={groupOptions}
                    showOwnership={viewMode !== "opportunities"}
                    layout="stacked"
                    searchPlaceholder={
                      viewMode === "opportunities" ? "Search opportunities" : undefined
                    }
                  />
                </div>
              </FiltersDrawer>
            </div>
          </div>
          {viewMode === "mine" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => openCreateDialogWithVisibility("private")}
                className="h-10 px-4 text-sm"
              >
                Add a private task
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => openCreateDialogWithVisibility("public")}
                className="h-10 px-4 text-sm"
              >
                Request a public task
              </Button>
            </div>
          ) : null}
        </div>

        <div className="hidden md:block">{filtersContent}</div>

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

  return (
    <div className="section-gap">
      <PageShell
        title={resolvedTitle}
        description={headingDescription}
        summaryChips={
          canManageTasks
            ? [
                { label: `Week ${weekLabel}`, tone: "mist" },
                { label: statsLabel, tone: "rose" }
              ]
            : []
        }
        actions={
          <>
            {renderViewToggle("hidden md:inline-flex")}
            {canManageTasks && (
              <Link
                href={routes.gratitudeBoard}
                className="rounded-button border border-mist-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-card transition hover:bg-mist-50"
              >
                Hours &amp; Gratitude Board
              </Link>
            )}
            {showCreateButton ? (
              <Button onClick={() => setIsCreateOpen(true)} className="h-9 px-3 text-sm">
                {ctaLabel}
              </Button>
            ) : null}
            <div className="md:hidden">
              <FiltersDrawer title="Filters">
                <div className="space-y-4">
                  {renderViewToggle()}
                  <TaskFilters
                    filters={filters}
                    groupOptions={groupOptions}
                    showOwnership={viewMode !== "opportunities"}
                    layout="stacked"
                    searchPlaceholder={
                      viewMode === "opportunities" ? "Search opportunities" : undefined
                    }
                  />
                </div>
              </FiltersDrawer>
            </div>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden space-y-4 lg:block">
            {renderViewToggle()}
            <Card className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                <HandHeartIcon className="h-4 w-4" />
                Filters
              </div>
              <TaskFilters
                filters={filters}
                groupOptions={groupOptions}
                showOwnership={viewMode !== "opportunities"}
                layout="stacked"
                searchPlaceholder={viewMode === "opportunities" ? "Search opportunities" : undefined}
              />
            </Card>
          </aside>

          <div className="space-y-5">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Serve list</p>
                  <p className="text-xs text-ink-400">{filteredCount} items shown</p>
                </div>
                {hasTasks ? (
                  <p className="text-xs text-ink-400">Total this week: {summary.total}</p>
                ) : null}
              </div>

              {canManageTasks && viewMode !== "opportunities" ? (
                <div className="mt-4">
                  <TaskQuickAdd weekId={weekId} />
                </div>
              ) : null}

              <div className="mt-4">{renderTasksContent()}</div>
            </Card>

            {canManageTasks && pendingAccessRequests.length ? (
              <Card>
                <div className="mb-3 text-sm font-semibold text-ink-900">Access approvals</div>
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
                        <SelectMenu
                          name={`role-${request.id}`}
                          value={accessRoles[request.id] ?? ""}
                          onValueChange={(value) =>
                            setAccessRoles((prev) => ({
                              ...prev,
                              [request.id]: value
                            }))
                          }
                          placeholder="Select role"
                          options={[
                            { value: "MEMBER", label: "Parishioner" },
                            { value: "SHEPHERD", label: "Clergy" },
                            { value: "ADMIN", label: "Admin" }
                          ]}
                          className="w-[160px]"
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
              </Card>
            ) : null}

            {canManageTasks && pendingTaskApprovals.length ? (
              <Card>
                <div className="mb-3 text-sm font-semibold text-ink-900">
                  Pending task approvals
                </div>
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
              </Card>
            ) : null}
          </div>
        </div>
      </PageShell>

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
