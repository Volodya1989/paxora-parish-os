"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import GroupCard from "@/components/groups/GroupCard";
import GroupCreateDialog from "@/components/groups/GroupCreateDialog";
import GroupEditDialog from "@/components/groups/GroupEditDialog";
import GroupFilters, { type GroupFilterTab } from "@/components/groups/GroupFilters";
import { archiveGroup, approveGroupRequest, deleteGroup, rejectGroupRequest, restoreGroup } from "@/server/actions/groups";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";
import { acceptInvite, declineInvite, joinGroup, leaveGroup, requestToJoin } from "@/app/actions/members";
import type { MemberActionState } from "@/lib/types/members";
import type { GroupInviteCandidate, GroupListItem } from "@/lib/queries/groups";
import FiltersDrawer from "@/components/app/filters-drawer";
import Card from "@/components/ui/Card";
import ListEmptyState from "@/components/app/list-empty-state";
import { useTranslations } from "@/lib/i18n/provider";
import { useLocale } from "@/lib/i18n/provider";
import QuoteCard from "@/components/app/QuoteCard";
import { buildLocalePathname } from "@/lib/i18n/routing";
import ActionRow from "@/components/shared/ActionRow";
import PendingRequestsSection from "@/components/shared/PendingRequestsSection";

type GroupsViewProps = {
  groups: GroupListItem[];
  parishId: string;
  actorUserId: string;
  inviteCandidates: GroupInviteCandidate[];
  canManageGroups: boolean;
  canRequestContentCreate: boolean;
};

export default function GroupsView({
  groups,
  parishId,
  actorUserId,
  inviteCandidates,
  canManageGroups,
  canRequestContentCreate
}: GroupsViewProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<GroupFilterTab>("active");
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

  const pendingRequestItems = useMemo(
    () =>
      pendingGroups.map((group) => ({
        id: group.id,
        title: group.name,
        description: group.description ?? "No description provided.",
        meta: `Requested by ${group.createdBy?.name ?? group.createdBy?.email ?? "Parishioner"}`
      })),
    [pendingGroups]
  );

  const myInvites = useMemo(
    () => groups.filter((group) => group.viewerMembershipStatus === "INVITED" && group.status === "ACTIVE"),
    [groups]
  );

  const joinedGroupOptions = useMemo(
    () =>
      groups
        .filter((group) => group.viewerMembershipStatus === "ACTIVE")
        .map((group) => ({ id: group.id, name: group.name })),
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
        description: t("groups.limitedAccessMessage"),
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
        description: t("groups.limitedAccessMessage"),
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

  const handleDeleteRequest = (groupId: string) => {
    if (!canManageGroups) {
      addToast({
        title: "Not enough access",
        description: t("groups.limitedAccessMessage"),
        status: "warning"
      });
      return;
    }
    setDeletingGroupId(groupId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGroupId) return;
    const groupId = deletingGroupId;
    setDeletingGroupId(null);

    await runGroupAction(groupId, async () => {
      await deleteGroup({ parishId, actorUserId, groupId });
      addToast({
        title: "Group deleted",
        description: "The group and its memberships have been permanently removed.",
        status: "success"
      });
    });
  };

  const handleEdit = (groupId: string) => {
    if (!canManageGroups) {
      addToast({
        title: "Not enough access",
        description: t("groups.limitedAccessMessage"),
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
          description={canManageGroups ? t("groups.empty.startMessage") : t("groups.empty.requestMessage")}
          action={canManageGroups ? <Button onClick={openCreateDialog}>{t("groups.startGroup")}</Button> : undefined}
          variant="friendly"
        />
      );
    }

    if (activeTab === "archived" && counts.archived === 0) {
      return <ListEmptyState title={t("groups.empty.noArchived")} description={t("groups.empty.noArchivedDesc")} />;
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
        quote={t("groups.quote")}
        source={t("groups.quoteSource")}
        tone="primary"
      />

      {/* Action bar */}
      <ActionRow
        addAriaLabel={t("groups.startGroup")}
        showAddButton={canManageGroups || canRequestContentCreate}
        onAdd={openCreateDialog}
        left={(
          <>
            <div className="md:hidden">
              <FiltersDrawer title={t("groups.filters.title")}>
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
          </>
        )}
      />

      {/* Pending invites for the current user */}
      {myInvites.length > 0 ? (
        <Card className="border-primary-200 bg-primary-50/40">
          <div className="mb-3 text-sm font-semibold text-ink-900">
            {t("groups.groupInvites")} ({myInvites.length})
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
                        t("groups.inviteAccepted")
                      )
                    }
                    disabled={pendingGroupId === group.id}
                  >
                    {t("groups.accept")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void handleMemberResult(
                        group.id,
                        () => declineInvite({ groupId: group.id }),
                        t("groups.inviteDeclined")
                      )
                    }
                    disabled={pendingGroupId === group.id}
                  >
                    {t("groups.decline")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

            <PendingRequestsSection
        entityType="GROUP"
        items={pendingRequestItems}
        canManage={canManageGroups}
        busyId={pendingGroupId}
        onApprove={(groupId) =>
          void runGroupAction(groupId, () => approveGroupRequest({ parishId, actorUserId, groupId }))
        }
        onDecline={(groupId) =>
          void runGroupAction(groupId, () => rejectGroupRequest({ parishId, actorUserId, groupId }))
        }
      />

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
                onDelete={() => handleDeleteRequest(group.id)}
                onManageMembers={() =>
                  router.push(buildLocalePathname(locale, `/groups/${group.id}/members`))
                }
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
        inviteCandidates={inviteCandidates}
        isRequest={!canManageGroups && canRequestContentCreate}
        onCreated={refreshList}
      />

      {/* Delete confirmation dialog */}
      {(() => {
        const deletingGroup = deletingGroupId
          ? groups.find((g) => g.id === deletingGroupId)
          : null;
        const dialogOpen = Boolean(deletingGroup);
        const dialogTitle = "Delete group permanently";
        const dialogBody = (
          <div className="space-y-3">
            <p>
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold">{deletingGroup?.name}</span>?
            </p>
            <p>
              This will remove all memberships and chat history. Tasks, events, and
              volunteer hours will be preserved but unlinked from this group.
            </p>
            <p className="font-medium text-rose-600">This action cannot be undone.</p>
          </div>
        );
        const dialogFooter = (
          <>
            <Button variant="secondary" onClick={() => setDeletingGroupId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleDeleteConfirm()}
            >
              Delete permanently
            </Button>
          </>
        );

        return isDesktop ? (
          <Modal
            open={dialogOpen}
            onClose={() => setDeletingGroupId(null)}
            title={dialogTitle}
            footer={dialogFooter}
          >
            {dialogBody}
          </Modal>
        ) : (
          <Drawer
            open={dialogOpen}
            onClose={() => setDeletingGroupId(null)}
            title={dialogTitle}
            footer={dialogFooter}
          >
            {dialogBody}
          </Drawer>
        );
      })()}

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
