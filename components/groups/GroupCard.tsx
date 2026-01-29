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
import { useTranslations } from "@/lib/i18n/provider";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type GroupCardProps = {
  group: GroupListItem;
  canManageGroup: boolean;
  canManageMembers: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onManageMembers: () => void;
  onJoin: () => void;
  onRequestJoin: () => void;
  onLeave: () => void;
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
  onManageMembers,
  onJoin,
  onRequestJoin,
  onLeave,
  isBusy = false,
  forceMenuOpen
}: GroupCardProps) {
  const t = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isArchived = Boolean(group.archivedAt);
  const isPending = group.status === "PENDING_APPROVAL";
  const isRejected = group.status === "REJECTED";
  const open = forceMenuOpen ?? menuOpen;

  const initials = getInitials(group.name) || "GR";
  const memberCount = group.memberCount ?? 0;
  const isMember = group.viewerMembershipStatus === "ACTIVE";
  const canOpenChat = isMember && !isArchived && group.status === "ACTIVE";
  const isInvited = group.viewerMembershipStatus === "INVITED";
  const isRequested = group.viewerMembershipStatus === "REQUESTED";
  const showJoinActions = !isMember && !isInvited && !isRequested && !isArchived && !isPending;
  const showMenu = canManageGroup || canManageMembers;

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
    <div className={cn(
      "rounded-lg border border-mist-100 bg-white transition",
      isBusy && "opacity-70"
    )}>
      {/* Compact row - always visible */}
      <div className="flex items-center gap-3 p-3">
        {/* Group avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
          {initials}
        </div>

        {/* Group info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink-900">{group.name}</h3>
            <Badge tone={group.visibility === "PUBLIC" ? "success" : "neutral"} className="shrink-0 text-[10px]">
              {group.visibility === "PUBLIC" ? t("common.public") : t("common.private")}
            </Badge>
            {isArchived ? <Badge tone="warning" className="shrink-0 text-[10px]">Archived</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-ink-500">
            {memberCount} {memberCount === 1 ? "member" : "members"}
            {group.unreadCount && group.unreadCount > 0 ? (
              <span className="ml-2 font-medium text-amber-600">
                {group.unreadCount} new
              </span>
            ) : null}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {showMenu ? (
            <Dropdown
              open={open}
              onOpenChange={(nextOpen) => {
                if (forceMenuOpen === undefined) {
                  setMenuOpen(nextOpen);
                }
              }}
            >
              <DropdownTrigger asChild iconOnly aria-label="Group options">
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-ink-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </Button>
              </DropdownTrigger>
              <DropdownMenu ariaLabel="Group menu">
                {canManageGroup ? <DropdownItem onClick={onEdit}>Edit</DropdownItem> : null}
                {canManageGroup ? (
                  isArchived ? (
                    <DropdownItem onClick={onRestore}>Restore</DropdownItem>
                  ) : (
                    <DropdownItem onClick={onArchive}>Archive</DropdownItem>
                  )
                ) : null}
                {canManageMembers ? (
                  <DropdownItem onClick={onManageMembers}>Manage members</DropdownItem>
                ) : null}
              </DropdownMenu>
            </Dropdown>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-8 w-8 items-center justify-center rounded text-ink-400 hover:bg-mist-50 hover:text-ink-600"
            aria-label={expanded ? "Hide details" : "Show details"}
          >
            <svg
              className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded ? (
        <div className="border-t border-mist-100 px-3 py-3">
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            {isPending ? <Badge tone="warning">Pending approval</Badge> : null}
            {isRejected ? <Badge tone="neutral">Not approved</Badge> : null}
            {isMember ? <Badge tone="neutral">Member</Badge> : null}
            {isInvited ? <Badge tone="warning">Invited</Badge> : null}
            {isRequested ? <Badge tone="warning">Request pending</Badge> : null}
            <Badge tone="neutral">
              {group.joinPolicy === "OPEN"
                ? "Join instantly"
                : group.joinPolicy === "REQUEST_TO_JOIN"
                  ? "Request approval"
                  : "Invite only"}
            </Badge>
          </div>

          {/* Description */}
          {group.description?.trim() ? (
            <p className="mt-2 text-sm text-ink-600">{group.description}</p>
          ) : null}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canOpenChat ? (
              <Link
                className="inline-flex items-center justify-center rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600"
                href={`/groups/${group.id}/chat`}
              >
                Open chat
              </Link>
            ) : null}
            {showJoinActions ? (
              group.joinPolicy === "INVITE_ONLY" ? (
                <span className="text-sm text-ink-400">Invite only</span>
              ) : (
                <Button type="button" size="sm" onClick={joinAction}>
                  {group.joinPolicy === "OPEN" ? "Join" : "Request to join"}
                </Button>
              )
            ) : null}
            {isMember && !isArchived ? (
              <Button type="button" variant="ghost" size="sm" onClick={onLeave}>
                Leave group
              </Button>
            ) : null}
            <Link
              className="text-sm font-medium text-ink-600 hover:text-ink-900"
              href={`/groups/${group.id}/members`}
            >
              Members
            </Link>
            <Link
              className="text-sm font-medium text-ink-600 hover:text-ink-900"
              href={`/groups/${group.id}`}
            >
              View details
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
