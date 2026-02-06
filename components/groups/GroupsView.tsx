"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import GroupCard from "@/components/groups/GroupCard";
import GroupCreateDialog from "@/components/groups/GroupCreateDialog";
import GroupEditDialog from "@/components/groups/GroupEditDialog";
import GroupFilters, { type GroupFilterTab } from "@/components/groups/GroupFilters";
import { archiveGroup, approveGroupRequest, rejectGroupRequest, restoreGroup } from "@/server/actions/groups";
import { acceptInvite, declineInvite, joinGroup, leaveGroup, requestToJoin } from "@/app/actions/members";
import type { MemberActionState } from "@/lib/types/members";
import type { GroupListItem } from "@/lib/queries/groups";
import FiltersDrawer from "@/components/app/filters-drawer";
import Card from "@/components/ui/Card";
import ListEmptyState from "@/components/app/list-empty-state";
import { useTranslations } from "@/lib/i18n/provider";
import QuoteCard from "@/components/app/QuoteCard";

const EMPTY_GROUPS_MESSAGE = "Start a group to bring people together around shared interests and faith.";
const REQUEST_GROUP_MESSAGE = "Have an idea for a group? Request one and start connecting with fellow parishioners.";
const NO_ARCHIVED_MESSAGE = "No archived groups — all groups are active and welcoming.";
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
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<GroupFilterTab>("active");
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      active: groups.filter((group) => !group.archivedAt && group.status === "ACTIVE").length,
      archived: groups.filter((group) => group.archivedAt).length
    }),
    [groups]
  );

  const pendingGroups = useMemo(
    () => groups.filter((group) => group.status === "PENDING_APPROVAL"),
    [groups]
  );

  const myInvites = useMemo(
    () => groups.filter((group) => group.viewerMembershipStatus === "INVITED" && group.status === "ACTIVE"),
    [groups]
  );

  useEffect(() => {
    if (searchParams?.get("create") !== "group") {
      return;
    }

    setIsCreateOpen(true);
  }, [addToast, canManageGroups, router, searchParams]);

  const openCreateDialog = () => {
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
        description: "We couldn't update that group. Please try again.",
        status: "error"
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
        description: LIMITED_ACCESS_MESSAGE,
        status: "warning"
      });
      return;
    }

    await runGroupAction(groupId, async () => {
      await archiveGroup({ parishId, actorUserId, groupId });
      addToast({
        title: "Group archived",
        description: "This group is tucked away but can be restored.",
        status: "success",
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
        description: LIMITED_ACCESS_MESSAGE,
        status: "warning"
      });
      return;
    }

    await runGroupAction(groupId, async () => {
      await restoreGroup({ parishId, actorUserId, groupId });
      addToast({
        title: "Group restored",
        description: "This group is back in the active list.",
        status: "success"
      });
    });
  };

  const handleEdit = (groupId: string) => {
    if (!canManageGroups) {
      addToast({
        title: "Not enough access",
        description: LIMITED_ACCESS_MESSAGE,
        status: "warning"
      });
      return;
    }
    setEditingGroupId(groupId);
  };

  const handleMemberResult = async (
    groupId: string,
    action: () => Promise<MemberActionState>,
    successTitle: string
  ) => {
    setPendingGroupId(groupId);
    const result = await action();
    if (result.status === "error") {
      addToast({
        title: "Update failed",
        description: result.message || "Please try again.",
        status: "error"
      });
      setPendingGroupId(null);
      return;
    }
    addToast({
      title: successTitle,
      description: result.message,
      status: "success"
    });
    setPendingGroupId(null);
    refreshList();
  };

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return groups.filter((group) => {
      const matchesTab =
        activeTab === "active"
          ? !group.archivedAt && group.status === "ACTIVE"
          : Boolean(group.archivedAt);
      if (!matchesTab) return false;

      if (!normalizedQuery) return true;

      const haystack = `${group.name} ${group.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeTab, groups, query]);

  const renderEmptyState = () => {
    if (activeTab === "active" && counts.active === 0) {
      return (
        <ListEmptyState
          title={t("empty.noGroups")}
          description={canManageGroups ? EMPTY_GROUPS_MESSAGE : REQUEST_GROUP_MESSAGE}
          action={
            <Button onClick={openCreateDialog}>
              {canManageGroups ? "Start a group" : "Suggest a group"}
            </Button>
          }
          variant="friendly"
        />
      );
    }

    if (activeTab === "archived" && counts.archived === 0) {
      return <ListEmptyState title="No archived groups" description={NO_ARCHIVED_MESSAGE} />;
    }

    return (
      <ListEmptyState
        title="No groups found"
        description="Try a different search or browse all groups."
      />
    );
  };

  return (
    <div className="section-gap">
      <QuoteCard
        quote="For where two or three gather in my name, there am I with them."
        source="Matthew 18:20"
        tone="primary"
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={openCreateDialog} className="h-10 px-4 text-sm">
          {canManageGroups ? "Start a group" : "Suggest a group"}
        </Button>
        <div className="md:hidden">
          <FiltersDrawer title="Filters">
            <GroupFilters
              activeTab={activeTab}
              onTabChange={setActiveTab}
              query={query}
              onQueryChange={setQuery}
              counts={counts}
              layout="stacked"
            />
          </FiltersDrawer>
        </div>
        <div className="hidden md:flex md:items-center md:gap-2">
          <GroupFilters
            activeTab={activeTab}
            onTabChange={setActiveTab}
            query={query}
            onQueryChange={setQuery}
            counts={counts}
            layout="inline"
          />
        </div>
      </div>

      {/* Pending invites for the current user */}
      {myInvites.length > 0 ? (
        <Card className="border-primary-200 bg-primary-50/40">
          <div className="mb-3 text-sm font-semibold text-ink-900">
            Group invites ({myInvites.length})
          </div>
          <div className="space-y-3">
            {myInvites.map((group) => (
              <div
                key={group.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary-200 bg-white px-3 py-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium text-ink-800">{group.name}</div>
                  {group.description ? (
                    <div className="text-xs text-ink-500 line-clamp-1">{group.description}</div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      void handleMemberResult(
                        group.id,
                        () => acceptInvite({ groupId: group.id }),
                        "Invite accepted"
                      )
                    }
                    disabled={pendingGroupId === group.id}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void handleMemberResult(
                        group.id,
                        () => declineInvite({ groupId: group.id }),
                        "Invite declined"
                      )
                    }
                    disabled={pendingGroupId === group.id}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Pending group requests — leaders see approve/reject, members see status */}
      {canManageGroups && pendingGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Group requests
          </p>
          {pendingGroups.map((group) => (
            <div
              key={group.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-4 border-amber-200 border-l-amber-400 bg-amber-50/60 px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-semibold text-ink-800">{group.name}</p>
                <p className="text-xs text-ink-500">
                  {group.description ?? "No description provided."}
                </p>
                <p className="text-xs text-ink-400">
                  Requested by{" "}
                  {group.createdBy?.name ?? group.createdBy?.email ?? "Parishioner"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void runGroupAction(group.id, () =>
                      approveGroupRequest({ parishId, actorUserId, groupId: group.id })
                    )
                  }
                  disabled={pendingGroupId === group.id}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void runGroupAction(group.id, () =>
                      rejectGroupRequest({ parishId, actorUserId, groupId: group.id })
                    )
                  }
                  disabled={pendingGroupId === group.id}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!canManageGroups && pendingGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Your pending requests
          </p>
          {pendingGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-l-4 border-mist-200 border-l-amber-400 bg-mist-50/60 px-4 py-3"
            >
              <p className="text-sm font-semibold text-ink-800">{group.name}</p>
              <p className="text-xs text-ink-500">
                {group.description ?? "No description provided."}
              </p>
              <p className="mt-1.5 text-xs font-semibold uppercase text-amber-600">
                Pending approval
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Group cards — flat list, no wrapper */}
      <div className="space-y-5">
        {filteredGroups.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                canManageGroup={canManageGroups}
                canManageMembers={
                  (canManageGroups || group.viewerMembershipStatus === "ACTIVE") &&
                  group.status === "ACTIVE"
                }
                onEdit={() => handleEdit(group.id)}
                onArchive={() => handleArchive(group.id)}
                onRestore={() => handleRestore(group.id)}
                onManageMembers={() => router.push(`/groups/${group.id}/members`)}
                onJoin={() =>
                  void handleMemberResult(
                    group.id,
                    () => joinGroup({ groupId: group.id }),
                    "Joined"
                  )
                }
                onRequestJoin={() =>
                  void handleMemberResult(
                    group.id,
                    () => requestToJoin({ groupId: group.id }),
                    "Request sent"
                  )
                }
                onLeave={() =>
                  void handleMemberResult(
                    group.id,
                    () => leaveGroup({ groupId: group.id }),
                    "Left group"
                  )
                }
                onAcceptInvite={() =>
                  void handleMemberResult(
                    group.id,
                    () => acceptInvite({ groupId: group.id }),
                    "Invite accepted"
                  )
                }
                onDeclineInvite={() =>
                  void handleMemberResult(
                    group.id,
                    () => declineInvite({ groupId: group.id }),
                    "Invite declined"
                  )
                }
                isBusy={pendingGroupId === group.id}
              />
            ))}
          </div>
        )}
      </div>

      <GroupCreateDialog
        open={isCreateOpen}
        onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreateDialog())}
        parishId={parishId}
        actorUserId={actorUserId}
        isRequest={!canManageGroups}
        onCreated={refreshList}
      />

      {editingGroupId ? (
        (() => {
          const editingGroup = groups.find((group) => group.id === editingGroupId);
          if (!editingGroup) {
            return null;
          }
          return (
            <GroupEditDialog
              open={Boolean(editingGroupId)}
              onOpenChange={(open) => setEditingGroupId(open ? editingGroupId : null)}
              parishId={parishId}
              actorUserId={actorUserId}
              group={editingGroup}
              onUpdated={refreshList}
            />
          );
        })()
      ) : null}
    </div>
  );
}
