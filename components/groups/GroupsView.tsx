"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import GroupCard from "@/components/groups/GroupCard";
import GroupCreateDialog from "@/components/groups/GroupCreateDialog";
import GroupFilters, { type GroupFilterTab } from "@/components/groups/GroupFilters";
import { archiveGroup, restoreGroup } from "@/server/actions/groups";
import type { GroupListItem } from "@/lib/queries/groups";

const EMPTY_GROUPS_MESSAGE = "Create a group to organize the people and ministries you lead.";
const NO_ARCHIVED_MESSAGE = "No archived groups yet. Everything is active.";
const LIMITED_ACCESS_MESSAGE = "Only parish leaders can manage groups.";

type GroupsViewProps = {
  groups: GroupListItem[];
  parishId: string;
  actorUserId: string;
  canManageGroups: boolean;
};

export default function GroupsView({
  groups,
  parishId,
  actorUserId,
  canManageGroups
}: GroupsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<GroupFilterTab>("active");
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      active: groups.filter((group) => !group.archivedAt).length,
      archived: groups.filter((group) => group.archivedAt).length
    }),
    [groups]
  );

  useEffect(() => {
    if (searchParams?.get("create") !== "group") {
      return;
    }

    if (!canManageGroups) {
      addToast({
        title: "Not enough access",
        description: LIMITED_ACCESS_MESSAGE
      });
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.delete("create");
      router.replace(`?${params.toString()}`, { scroll: false });
      return;
    }

    setIsCreateOpen(true);
  }, [addToast, canManageGroups, router, searchParams]);

  const openCreateDialog = () => {
    if (!canManageGroups) {
      addToast({
        title: "Not enough access",
        description: LIMITED_ACCESS_MESSAGE
      });
      return;
    }
    setIsCreateOpen(true);
  };

  const closeCreateDialog = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("create");
    router.replace(`?${params.toString()}`, { scroll: false });
    setIsCreateOpen(false);
  };

  const refreshList = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runGroupAction = async (groupId: string, action: () => Promise<void>) => {
    setPendingGroupId(groupId);
    try {
      await action();
    } catch (error) {
      addToast({
        title: "Update failed",
        description: "We couldn't update that group. Please try again."
      });
    } finally {
      setPendingGroupId(null);
      refreshList();
    }
  };

  const handleArchive = async (groupId: string) => {
    if (!canManageGroups) {
      addToast({
        title: "Not enough access",
        description: LIMITED_ACCESS_MESSAGE
      });
      return;
    }

    await runGroupAction(groupId, async () => {
      await archiveGroup({ parishId, actorUserId, groupId });
      addToast({
        title: "Group archived",
        description: "This group is tucked away but can be restored.",
        actionLabel: "Undo",
        onAction: () => {
          void runGroupAction(groupId, async () => {
            await restoreGroup({ parishId, actorUserId, groupId });
          });
        }
      });
    });
  };

  const handleRestore = async (groupId: string) => {
    if (!canManageGroups) {
      addToast({
        title: "Not enough access",
        description: LIMITED_ACCESS_MESSAGE
      });
      return;
    }

    await runGroupAction(groupId, async () => {
      await restoreGroup({ parishId, actorUserId, groupId });
      addToast({
        title: "Group restored",
        description: "This group is back in the active list."
      });
    });
  };

  const handleEdit = () => {
    addToast({
      title: "Edits coming soon",
      description: "Editing group details is on the way."
    });
  };

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return groups.filter((group) => {
      const matchesTab = activeTab === "active" ? !group.archivedAt : Boolean(group.archivedAt);
      if (!matchesTab) return false;

      if (!normalizedQuery) return true;

      const haystack = `${group.name} ${group.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeTab, groups, query]);

  const renderEmptyState = () => {
    if (activeTab === "active" && counts.active === 0) {
      return (
        <EmptyState
          title="No groups yet"
          description={EMPTY_GROUPS_MESSAGE}
          action={<Button onClick={openCreateDialog}>Create group</Button>}
        />
      );
    }

    if (activeTab === "archived" && counts.archived === 0) {
      return <EmptyState title="No archived groups" description={NO_ARCHIVED_MESSAGE} />;
    }

    return (
      <EmptyState
        title="No matches"
        description="We couldn't find a group that matches this search."
      />
    );
  };

  return (
    <div className="section-gap">
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h1">Groups</h1>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                {counts.active} active
              </span>
            </div>
            <p className="text-sm text-ink-500">
              Keep parish teams organized, aligned, and ready for the week ahead.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-ink-400">Archived</p>
              <p className="text-sm font-semibold text-ink-700">{counts.archived}</p>
            </div>
            <Button onClick={openCreateDialog}>Create group</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-h3">Filters</h2>
            <p className="text-xs text-ink-400">
              Switch between active and archived groups, or search by name.
            </p>
          </div>
          <GroupFilters
            activeTab={activeTab}
            onTabChange={setActiveTab}
            query={query}
            onQueryChange={setQuery}
            counts={counts}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h3">Group list</h2>
            <p className="text-xs text-ink-400">
              {filteredGroups.length} groups shown
            </p>
          </div>
          <p className="text-xs text-ink-400">Total: {groups.length}</p>
        </div>

        <div className="mt-4">
          {filteredGroups.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onEdit={handleEdit}
                  onArchive={() => handleArchive(group.id)}
                  onRestore={() => handleRestore(group.id)}
                  isBusy={pendingGroupId === group.id}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      <GroupCreateDialog
        open={isCreateOpen}
        onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreateDialog())}
        parishId={parishId}
        actorUserId={actorUserId}
        onCreated={refreshList}
      />
    </div>
  );
}
