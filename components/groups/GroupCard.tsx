"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
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

const placeholderNames = ["Alex", "Jordan", "Casey", "Morgan", "Riley", "Quinn", "Harper"];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hashString(value: string) {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function buildAvatarInitials(name: string, memberCount: number | null) {
  const baseInitials = getInitials(name) || "GR";
  const avatarCount = memberCount && memberCount > 0 ? Math.min(3, memberCount) : 2;
  const seed = hashString(name);
  const initials = [baseInitials];

  for (let i = 1; i < avatarCount; i += 1) {
    const placeholder = placeholderNames[(seed + i) % placeholderNames.length];
    initials.push(getInitials(placeholder));
  }

  return initials;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
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
  const isArchived = Boolean(group.archivedAt);
  const isPending = group.status === "PENDING_APPROVAL";
  const isRejected = group.status === "REJECTED";
  const open = forceMenuOpen ?? menuOpen;

  const avatarInitials = useMemo(
    () => buildAvatarInitials(group.name, group.memberCount),
    [group.memberCount, group.name]
  );

  const memberCountLabel = group.memberCount ?? "—";
  const memberSuffix =
    typeof group.memberCount === "number" && group.memberCount === 1 ? "member" : "members";
  const isMember = group.viewerMembershipStatus === "ACTIVE";
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
    <Card className={cn("space-y-4", isBusy && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ink-900">{group.name}</h3>
            {isArchived ? <Badge tone="warning">Archived</Badge> : null}
            {isPending ? <Badge tone="warning">Pending approval</Badge> : null}
            {isRejected ? <Badge tone="neutral">Not approved</Badge> : null}
            <Badge tone={group.visibility === "PUBLIC" ? "success" : "neutral"}>
              {group.visibility === "PUBLIC" ? t("common.public") : t("common.private")}
            </Badge>
            <Badge tone="neutral">
              {group.joinPolicy === "OPEN"
                ? "Join instantly"
                : group.joinPolicy === "REQUEST_TO_JOIN"
                ? "Request approval"
                : "Invite only"}
            </Badge>
          </div>
          {group.description?.trim() ? (
            <p className="text-sm text-ink-500">{group.description}</p>
          ) : null}
        </div>
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
              <Button type="button" variant="ghost" size="sm" className="text-ink-500">
                ⋯
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {avatarInitials.map((initials, index) => (
              <span
                key={`${initials}-${index}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-emerald-100 text-xs font-semibold text-emerald-800"
              >
                {initials}
              </span>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-400">Members</p>
            <p className="text-sm font-semibold text-ink-700">
              {memberCountLabel === "—" ? "—" : `${memberCountLabel} ${memberSuffix}`}
            </p>
          </div>
        </div>
        <p className="text-xs text-ink-400">Last updated {formatDate(group.createdAt)}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
          {isMember ? <Badge tone="neutral">Member</Badge> : null}
          {isInvited ? <Badge tone="warning">Invited</Badge> : null}
          {isRequested ? <Badge tone="warning">Request pending</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isMember && !isArchived ? (
            <Link
              className="text-xs font-medium text-ink-700 underline"
              href={`/groups/${group.id}/chat`}
            >
              Open chat
            </Link>
          ) : null}
          {isMember && !isArchived ? (
            <Button type="button" variant="ghost" size="sm" onClick={onLeave}>
              Leave group
            </Button>
          ) : null}
          {showJoinActions ? (
            group.joinPolicy === "INVITE_ONLY" ? (
              <span className="text-xs font-medium text-ink-400">Invite only</span>
            ) : (
              <Button type="button" size="sm" onClick={joinAction}>
                {group.joinPolicy === "OPEN" ? "Join" : "Request to join"}
              </Button>
            )
          ) : null}
          {canManageMembers ? (
            <Link
              className="text-xs font-medium text-ink-700 underline"
              href={`/groups/${group.id}/members`}
            >
              Members
            </Link>
          ) : null}
          <Link
            className="text-xs font-medium text-ink-700 underline"
            href={`/groups/${group.id}`}
          >
            View details
          </Link>
        </div>
      </div>
    </Card>
  );
}
