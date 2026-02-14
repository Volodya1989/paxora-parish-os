"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from "@/components/ui/Dropdown";
import type { GroupListItem } from "@/lib/queries/groups";
import { cn } from "@/lib/ui/cn";
import { useLocale, useTranslations } from "@/lib/i18n/provider";
import { buildLocalePathname } from "@/lib/i18n/routing";
import GroupListRow from "@/components/groups/GroupListRow";

type GroupCardProps = {
  group: GroupListItem;
  canManageGroup: boolean;
  canManageMembers: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onManageMembers: () => void;
  onJoin: () => void;
  onRequestJoin: () => void;
  onLeave: () => void;
  onAcceptInvite: () => void;
  onDeclineInvite: () => void;
  isBusy?: boolean;
  forceMenuOpen?: boolean;
};

export default function GroupCard({
  group,
  canManageGroup,
  canManageMembers,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onManageMembers,
  onJoin,
  onRequestJoin,
  onLeave,
  onAcceptInvite,
  onDeclineInvite,
  isBusy = false,
  forceMenuOpen
}: GroupCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const isArchived = Boolean(group.archivedAt);
  const isPending = group.status === "PENDING_APPROVAL";
  const isRejected = group.status === "REJECTED";
  const open = forceMenuOpen ?? menuOpen;
  const isMember = group.viewerMembershipStatus === "ACTIVE";
  const canOpenChat = isMember && !isArchived && group.status === "ACTIVE";
  const isInvited = group.viewerMembershipStatus === "INVITED";
  const isRequested = group.viewerMembershipStatus === "REQUESTED";
  const showJoinActions = !isMember && !isInvited && !isRequested && !isArchived && !isPending;
  const showMenu = canManageGroup || canManageMembers || isMember;

  const joinAction = () => {
    if (group.joinPolicy === "OPEN") {
      onJoin();
      return;
    }
    if (group.joinPolicy === "REQUEST_TO_JOIN") {
      onRequestJoin();
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-mist-100 bg-white px-4 py-3 shadow-sm transition-all duration-200",
        canOpenChat && "cursor-pointer hover:-translate-y-0.5 hover:border-mist-200 hover:shadow-md",
        isBusy && "opacity-70"
      )}
      onClick={() => {
        if (!canOpenChat || typeof window === "undefined") return;
        window.location.href = buildLocalePathname(locale, `/groups/${group.id}/chat`);
      }}
      role={canOpenChat ? "button" : undefined}
    >
      <GroupListRow
        name={group.name}
        avatarUrl={group.avatarUrl}
        description={group.description}
        lastMessage={group.lastMessage}
        lastMessageAuthor={group.lastMessageAuthor}
        lastMessageTime={group.lastMessageTime}
        className="min-w-0 flex flex-1 items-center gap-3"
        meta={(
          <>
            {isArchived ? <Badge tone="warning">Archived</Badge> : null}
            {isPending ? <Badge tone="warning">Pending</Badge> : null}
            {isRejected ? <Badge tone="neutral">Not approved</Badge> : null}
            {isMember ? <span className="text-xs font-medium text-primary-600">{t("groups.joined")}</span> : null}
          </>
        )}
      />
      <div className="flex shrink-0 items-center gap-2">
        {group.unreadCount && group.unreadCount > 0 ? <Badge tone="warning">{group.unreadCount}</Badge> : null}
        {isInvited ? (
          <>
            <Button type="button" size="sm" onClick={(e) => { e.stopPropagation(); onAcceptInvite(); }} disabled={isBusy}>{t("groups.accept")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDeclineInvite(); }} disabled={isBusy}>{t("groups.decline")}</Button>
          </>
        ) : null}
        {showJoinActions ? (
          group.joinPolicy === "INVITE_ONLY" ? (
            <span className="text-xs font-medium text-ink-400">{t("groups.inviteOnly")}</span>
          ) : (
            <Button type="button" size="sm" onClick={(e) => { e.stopPropagation(); joinAction(); }}>
              {group.joinPolicy === "OPEN" ? t("groups.join") : t("groups.requestToJoin")}
            </Button>
          )
        ) : null}

        {showMenu || !showJoinActions ? (
          <Dropdown
            open={open}
            onOpenChange={(nextOpen) => {
              if (forceMenuOpen === undefined) setMenuOpen(nextOpen);
            }}
          >
            <DropdownTrigger asChild iconOnly aria-label={t("groups.optionsFor").replace("{name}", group.name)}>
              <Button type="button" variant="ghost" size="sm" className="text-ink-500" onClick={(e) => e.stopPropagation()}>⋯</Button>
            </DropdownTrigger>
            <DropdownMenu ariaLabel={t("groups.menuFor").replace("{name}", group.name)}>
              <DropdownItem asChild>
                <Link href={buildLocalePathname(locale, `/groups/${group.id}`)}>{t("groups.viewDetails")}</Link>
              </DropdownItem>
              {canManageMembers ? <DropdownItem onClick={onManageMembers}>{t("groups.viewMembers")}</DropdownItem> : null}
              {canManageGroup ? <DropdownItem onClick={onEdit}>Edit</DropdownItem> : null}
              {canManageGroup ? (isArchived ? <><DropdownItem onClick={onRestore}>Restore</DropdownItem><DropdownItem onClick={onDelete} className="text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50">Delete permanently</DropdownItem></> : <DropdownItem onClick={onArchive}>Archive</DropdownItem>) : null}
              {isMember && !isArchived ? <DropdownItem onClick={onLeave} className="text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50">Leave group</DropdownItem> : null}
            </DropdownMenu>
          </Dropdown>
        ) : null}
      </div>
    </div>
  );
}
