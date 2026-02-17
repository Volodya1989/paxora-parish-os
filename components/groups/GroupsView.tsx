"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import GroupCard from "@/components/groups/GroupCard";
import GroupChatListCard from "@/components/groups/GroupChatListCard";
import Link from "next/link";
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
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ListEmptyState from "@/components/app/list-empty-state";
import { useTranslations } from "@/lib/i18n/provider";
import { useLocale } from "@/lib/i18n/provider";
import QuoteCard from "@/components/app/QuoteCard";
import { buildLocalePathname } from "@/lib/i18n/routing";
import HeaderActionBar from "@/components/shared/HeaderActionBar";
import PendingRequestsSection from "@/components/shared/PendingRequestsSection";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from "@/components/ui/Dropdown";
import HiddenGroupIcon from "@/components/groups/HiddenGroupIcon";

type GroupsViewProps = {
  groups: GroupListItem[];
  parishId: string;
  actorUserId: string;
  inviteCandidates: GroupInviteCandidate[];
  canManageGroups: boolean;
  canRequestContentCreate: boolean;
  contactParishHref?: string | null;
};

export function getDiscoverGroupCardAction(input: {
  joinPolicy: GroupListItem["joinPolicy"];
  membershipStatus: GroupListItem["viewerMembershipStatus"] | "REQUESTED";
}) {
  if (input.membershipStatus === "ACTIVE") {
    return "navigate" as const;
  }

  if (input.joinPolicy === "INVITE_ONLY") {
    return "show_limited_membership" as const;
  }

  if (input.joinPolicy === "REQUEST_TO_JOIN") {
    return input.membershipStatus === "REQUESTED"
      ? ("none" as const)
      : ("request_to_join" as const);
  }

  return "join" as const;
}

export function getJoinedGroupMenuActions(canManageGroups: boolean) {
  return canManageGroups
    ? (["view_members", "view_details", "edit", "archive", "leave"] as const)
    : (["view_members", "leave"] as const);
}

export default function GroupsView({
  groups,
  parishId,
  actorUserId,
  inviteCandidates,
  canManageGroups,
  canRequestContentCreate,
  contactParishHref
}: GroupsViewProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<GroupFilterTab>("active");
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null);
  const [restrictedGroupName, setRestrictedGroupName] = useState<string | null>(null);
  const [optimisticMembershipStatus, setOptimisticMembershipStatus] = useState<Record<string, "ACTIVE" | "REQUESTED">>({});
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
  const hasSearchQuery = query.trim().length > 0;

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

  const closeRestrictedMembershipDialog = () => setRestrictedGroupName(null);

  const openRestrictedMembershipDialog = (groupName: string) => {
    setRestrictedGroupName(groupName);
  };

  const handleContactParish = () => {
    if (!contactParishHref) {
      return;
    }

    if (contactParishHref.startsWith("http://") || contactParishHref.startsWith("https://")) {
      window.location.href = contactParishHref;
      return;
    }

    router.push(contactParishHref);
  };


  const handleMemberResult = async (
    groupId: string,
    action: () => Promise<MemberActionState>,
    successTitle: string,
    optimisticStatus?: "ACTIVE" | "REQUESTED"
  ) => {
    setPendingGroupId(groupId);
    const previousStatus = optimisticMembershipStatus[groupId];
    if (optimisticStatus) {
      setOptimisticMembershipStatus((current) => ({ ...current, [groupId]: optimisticStatus }));
    }

    const result = await action();
    if (result.status === "error") {
      addToast({
        title: "Update failed",
        description: result.message || "Please try again.",
        status: "error"
      });
      setPendingGroupId(null);
      if (optimisticStatus) {
        setOptimisticMembershipStatus((current) => {
          const next = { ...current };
          if (previousStatus) {
            next[groupId] = previousStatus;
          } else {
            delete next[groupId];
          }
          return next;
        });
      }
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

  const activeGroups = useMemo(
    () => groups.filter((group) => !group.archivedAt && group.status === "ACTIVE"),
    [groups]
  );

  const archivedGroups = useMemo(() => groups.filter((group) => Boolean(group.archivedAt)), [groups]);

  const searchedActiveGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return activeGroups;
    }

    return activeGroups.filter((group) => {
      const haystack = `${group.name} ${group.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeGroups, query]);

  const searchedArchivedGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return archivedGroups;
    }

    return archivedGroups.filter((group) => {
      const haystack = `${group.name} ${group.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [archivedGroups, query]);

  const joinedGroups = useMemo(
    () =>
      searchedActiveGroups.filter(
        (group) =>
          (optimisticMembershipStatus[group.id] ?? group.viewerMembershipStatus) === "ACTIVE"
      ),
    [optimisticMembershipStatus, searchedActiveGroups]
  );

  const discoverGroups = useMemo(
    () =>
      searchedActiveGroups.filter((group) => {
        const status = (optimisticMembershipStatus[group.id] ?? group.viewerMembershipStatus) as string | null;
        return status !== "ACTIVE" && status !== "INVITED";
      }),
    [optimisticMembershipStatus, searchedActiveGroups]
  );

  const renderArchivedEmptyState = () => {
    if (counts.archived === 0) {
      return <ListEmptyState title={t("groups.empty.noArchived")} description={t("groups.empty.noArchivedDesc")} />;
    }

    return (
      <ListEmptyState
        title={t("emptyStates.noMatches")}
        description={t("emptyStates.noMatchesDesc")}
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

      {/* Unified header action bar */}
      <HeaderActionBar
        onFilterClick={() => setFiltersOpen(true)}
        filterActive={activeTab !== "active" || query.length > 0}
        onAddClick={canManageGroups || canRequestContentCreate ? openCreateDialog : undefined}
        addLabel={t("groups.startGroup")}
        left={
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
        }
      />

      {/* Mobile filter drawer */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("groups.filters.title")}
      >
        <GroupFilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          query={query}
          onQueryChange={setQuery}
          counts={counts}
          layout="stacked"
        />
      </Drawer>

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

      <div className="space-y-6">
        {activeTab === "active" ? (
          <>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">Your groups</h2>
                <span className="text-xs text-ink-400">{joinedGroups.length}</span>
              </div>

              {joinedGroups.length === 0 ? (
                <ListEmptyState
                  title={hasSearchQuery ? t("emptyStates.noMatches") : t("empty.noGroups")}
                  description={
                    hasSearchQuery
                      ? t("emptyStates.noMatchesDesc")
                      : canManageGroups
                        ? t("groups.empty.startMessage")
                        : t("empty.noGroupsDesc")
                  }
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      {hasSearchQuery ? (
                        <Button type="button" variant="secondary" onClick={() => setQuery("")}>
                          {t("emptyStates.clearFilters")}
                        </Button>
                      ) : null}
                      {canManageGroups || canRequestContentCreate ? (
                        <Button type="button" onClick={openCreateDialog}>
                          {t("groups.startGroup")}
                        </Button>
                      ) : null}
                    </div>
                  }
                  variant="friendly"
                />
              ) : (
                <div className="space-y-2">
                  {joinedGroups.map((group) => (
                    <GroupChatListCard
                      key={group.id}
                      name={group.name}
                      avatarUrl={group.avatarUrl}
                      description={group.description}
                      lastMessage={group.lastMessage}
                      lastMessageAuthor={group.lastMessageAuthor}
                      lastMessageTime={group.lastMessageTime}
                      unreadCount={group.unreadCount}
                      href={buildLocalePathname(locale, `/groups/${group.id}/chat`)}
                      meta={group.visibility === "PRIVATE" ? <HiddenGroupIcon /> : null}
                      menu={(
                        <Dropdown>
                          <DropdownTrigger asChild iconOnly aria-label={t("groups.optionsFor").replace("{name}", group.name)}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-ink-500"
                              onClick={(event) => event.stopPropagation()}
                            >
                              ⋯
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu ariaLabel={t("groups.menuFor").replace("{name}", group.name)}>
                            {getJoinedGroupMenuActions(canManageGroups).map((action) => {
                              if (action === "view_members") {
                                return (
                                  <DropdownItem key={action} onClick={() => router.push(buildLocalePathname(locale, `/groups/${group.id}/members`))}>
                                    {t("groups.viewMembers")}
                                  </DropdownItem>
                                );
                              }

                              if (action === "view_details") {
                                return (
                                  <DropdownItem key={action} asChild>
                                    <Link href={buildLocalePathname(locale, `/groups/${group.id}`)}>{t("groups.viewDetails")}</Link>
                                  </DropdownItem>
                                );
                              }

                              if (action === "edit") {
                                return <DropdownItem key={action} onClick={() => handleEdit(group.id)}>{t("groups.edit")}</DropdownItem>;
                              }

                              if (action === "archive") {
                                return <DropdownItem key={action} onClick={() => handleArchive(group.id)}>{t("groups.archive")}</DropdownItem>;
                              }

                              return (
                                <DropdownItem
                                  key={action}
                                  onClick={() =>
                                    void handleMemberResult(
                                      group.id,
                                      () => leaveGroup({ groupId: group.id }),
                                      t("groups.leftGroup")
                                    )
                                  }
                                >
                                  {t("groups.leave")}
                                </DropdownItem>
                              );
                            })}
                          </DropdownMenu>
                        </Dropdown>
                      )}
                    />
                  ))}
                </div>
              )}
            </section>

            {discoverGroups.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">Groups you can join</h2>
                <div className="space-y-2">
                  {discoverGroups.map((group) => {
                    const status = optimisticMembershipStatus[group.id] ?? group.viewerMembershipStatus;
                    const isRequested = status === "REQUESTED";
                    const canJoin = group.joinPolicy === "OPEN";
                    const canRequest = group.joinPolicy === "REQUEST_TO_JOIN";

                    const handleDiscoverGroupPress = () => {
                      const action = getDiscoverGroupCardAction({
                        joinPolicy: group.joinPolicy,
                        membershipStatus: status
                      });

                      if (action === "show_limited_membership") {
                        openRestrictedMembershipDialog(group.name);
                        return;
                      }

                      if (action === "request_to_join") {
                        void handleMemberResult(
                          group.id,
                          () => requestToJoin({ groupId: group.id }),
                          "Request sent",
                          "REQUESTED"
                        );
                        return;
                      }

                      if (action === "join") {
                        void handleMemberResult(
                          group.id,
                          () => joinGroup({ groupId: group.id }),
                          "Joined",
                          "ACTIVE"
                        );
                      }
                    };

                    return (
                      <button
                        key={group.id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl border border-mist-100 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-mist-200"
                        onClick={handleDiscoverGroupPress}
                        disabled={pendingGroupId === group.id}
                        aria-label={t("groups.openGroupCard").replace("{name}", group.name)}
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                          {group.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={group.avatarUrl} alt={group.name} className="h-full w-full object-cover" />
                          ) : (
                            group.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-ink-900">{group.name}</p>
                            {group.visibility === "PRIVATE" ? <HiddenGroupIcon /> : null}
                            {group.joinPolicy === "INVITE_ONLY" ? (
                              <Badge tone="neutral"><span aria-hidden="true" className="mr-1">🔒</span>{t("groups.inviteOnly")}</Badge>
                            ) : group.joinPolicy === "REQUEST_TO_JOIN" ? (
                              <Badge tone="warning">{t("groups.requestAccess")}</Badge>
                            ) : (
                              <Badge tone="success">{t("groups.public")}</Badge>
                            )}
                          </div>
                          <p className="truncate text-sm text-ink-500">{group.description ?? t("groups.defaultDescription")}</p>
                          {typeof group.memberCount === "number" ? (
                            <p className="text-xs text-ink-400">{group.memberCount} {group.memberCount === 1 ? t("groups.memberSingular") : t("groups.memberPlural")}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
                          {isRequested ? (
                            <Badge tone="warning">{t("groups.requestPending")}</Badge>
                          ) : canJoin ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                void handleMemberResult(
                                  group.id,
                                  () => joinGroup({ groupId: group.id }),
                                  "Joined",
                                  "ACTIVE"
                                )
                              }
                              disabled={pendingGroupId === group.id}
                              aria-label={t("groups.joinGroupAria").replace("{name}", group.name)}
                            >
                              {t("groups.join")}
                            </Button>
                          ) : canRequest ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                void handleMemberResult(
                                  group.id,
                                  () => requestToJoin({ groupId: group.id }),
                                  "Request sent",
                                  "REQUESTED"
                                )
                              }
                              disabled={pendingGroupId === group.id}
                              aria-label={t("groups.requestJoinAria").replace("{name}", group.name)}
                            >
                              {t("groups.requestToJoin")}
                            </Button>
                          ) : (
                            <span className="text-xs font-medium text-ink-400">{t("groups.inviteOnly")}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        ) : searchedArchivedGroups.length === 0 ? (
          renderArchivedEmptyState()
        ) : (
          <div className="space-y-2">
            {searchedArchivedGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                canManageGroup={canManageGroups}
                canManageMembers={(canManageGroups || group.viewerMembershipStatus === "ACTIVE") && group.status === "ACTIVE"}
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

      {isDesktop ? (
        <Modal
          open={Boolean(restrictedGroupName)}
          onClose={closeRestrictedMembershipDialog}
          title={t("groups.limitedMembershipTitle")}
          footer={(
            <>
              {contactParishHref ? (
                <Button
                  type="button"
                  onClick={handleContactParish}
                  aria-label={t("groups.contactParish")}
                >
                  {t("groups.contactParish")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={closeRestrictedMembershipDialog}
                aria-label={t("groups.close")}
              >
                {t("groups.close")}
              </Button>
            </>
          )}
        >
          <p>{t("groups.limitedMembershipBody")}</p>
        </Modal>
      ) : (
        <Drawer
          open={Boolean(restrictedGroupName)}
          onClose={closeRestrictedMembershipDialog}
          title={t("groups.limitedMembershipTitle")}
          footer={(
            <>
              {contactParishHref ? (
                <Button
                  type="button"
                  onClick={handleContactParish}
                  aria-label={t("groups.contactParish")}
                >
                  {t("groups.contactParish")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={closeRestrictedMembershipDialog}
                aria-label={t("groups.close")}
              >
                {t("groups.close")}
              </Button>
            </>
          )}
        >
          <p>{t("groups.limitedMembershipBody")}</p>
        </Drawer>
      )}

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
