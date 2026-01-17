"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import TaskCreateDialog from "@/components/tasks/TaskCreateDialog";
import TaskFilters from "@/components/tasks/TaskFilters";
import TasksEmptyState from "@/components/tasks/TasksEmptyState";
import TasksList from "@/components/tasks/TasksList";
import type { TaskFilters as TaskFiltersState, TaskListItem, TaskListSummary } from "@/lib/queries/tasks";
import type { PendingAccessRequest } from "@/lib/queries/access";
import type { PendingTaskApproval } from "@/lib/queries/tasks";
import { approveTask, rejectTask } from "@/server/actions/tasks";

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
};

export default function TasksView({
  title = "Tasks",
  description,
  ctaLabel = "New Task",
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
  rejectAccessAction
}: TasksViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [accessRoles, setAccessRoles] = useState<Record<string, string>>({});
  const [isApproving, startApprovalTransition] = useTransition();
  const [isAccessPending, startAccessTransition] = useTransition();

  const createParam = searchParams?.get("create");
  const hasTasks = summary.total > 0;
  const hasMatches = filteredCount > 0;

  useEffect(() => {
    if (createParam === "task") {
      setIsCreateOpen(true);
    }
  }, [createParam]);

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
    return `${summary.open} open · ${summary.done} done`;
  }, [summary.done, summary.open]);

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
    description ?? `Keep the week grounded with the next faithful steps. ${weekRange}`;

  return (
    <div className="section-gap">
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h1">{title}</h1>
              <span className="rounded-full bg-mist-100 px-3 py-1 text-xs font-medium text-ink-700">
                Week {weekLabel}
              </span>
            </div>
            <p className="text-sm text-ink-500">{headingDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-ink-400">Progress</p>
              <p className="text-sm font-semibold text-ink-700">{statsLabel}</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>{ctaLabel}</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-h3">Filters</h2>
            <p className="text-xs text-ink-400">
              Narrow the list to the tasks that need your attention.
            </p>
          </div>
          <TaskFilters filters={filters} groupOptions={groupOptions} />
        </div>
      </Card>

      {pendingAccessRequests.length ? (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-h3">Access approvals</h2>
              <p className="text-xs text-ink-400">
                Review pending parish access requests.
              </p>
            </div>
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
                    Requested {request.requestedAt.toLocaleDateString()}
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
          </div>
        </Card>
      ) : null}

      {pendingTaskApprovals.length ? (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-h3">Pending task approvals</h2>
              <p className="text-xs text-ink-400">
                Review member-submitted public tasks before they go live.
              </p>
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
                      Created by {task.createdBy.name} · Assigned to {task.owner.name}
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
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h3">Task list</h2>
            <p className="text-xs text-ink-400">{filteredCount} tasks shown</p>
          </div>
          {hasTasks ? (
            <p className="text-xs text-ink-400">Total this week: {summary.total}</p>
          ) : null}
        </div>

        <div className="mt-4">
          {/* Grouped sections reinforce status context while keeping filters and empty states visible. */}
          {!hasTasks ? (
            <TasksEmptyState variant="no-tasks" onCreate={() => setIsCreateOpen(true)} />
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
        </div>
      </Card>

      <TaskCreateDialog
        open={isCreateOpen}
        onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreateDialog())}
        weekId={weekId}
        groupOptions={groupOptions}
        memberOptions={memberOptions}
        currentUserId={currentUserId}
      />
    </div>
  );
}
