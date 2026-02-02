"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canOpenChat) return;
    const target = event.target as HTMLElement | null;
    const interactiveTarget = target?.closest(
      "button, a, input, textarea, select, [role='button']"
    );
    if (interactiveTarget && interactiveTarget !== event.currentTarget) {
      return;
    }
    router.push(`/groups/${group.id}/chat`);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canOpenChat) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(`/groups/${group.id}/chat`);
    }
  };

  return (
    <Card
      className={cn(
        "space-y-3 p-3 sm:p-4",
        canOpenChat && "cursor-pointer transition hover:border-primary-200 hover:bg-primary-50/40",
        isBusy && "opacity-70"
      )}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={canOpenChat ? "button" : undefined}
      tabIndex={canOpenChat ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink-900 break-words">{group.name}</h3>
            {isArchived ? <Badge tone="warning">Archived</Badge> : null}
            {isPending ? <Badge tone="warning">Pending</Badge> : null}
            {isRejected ? <Badge tone="neutral">Not approved</Badge> : null}
            {group.unreadCount && group.unreadCount > 0 ? (
              <Badge tone="warning">{group.unreadCount} new</Badge>
            ) : null}
          </div>
          {group.description?.trim() ? (
            <p className="text-xs leading-relaxed text-ink-500 break-words line-clamp-2">{group.description}</p>
          ) : null}
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {avatarInitials.slice(0, 3).map((initials, index) => (
                  <span
                    key={`${initials}-${index}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-100 text-[8px] font-semibold text-emerald-800"
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <span>{memberCountLabel === "—" ? "—" : `${memberCountLabel} ${memberSuffix}`}</span>
            </div>
            {isMember ? (
              <span className="font-medium text-primary-600">Joined</span>
            ) : null}
            {isInvited ? (
              <span className="font-medium text-amber-600">Invited</span>
            ) : null}
            {isRequested ? (
              <span className="font-medium text-amber-600">Request pending</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Join/Request button — kept visible for discoverability */}
          {showJoinActions ? (
            group.joinPolicy === "INVITE_ONLY" ? (
              <span className="text-xs font-medium text-ink-400">Invite only</span>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={(e) => { e.stopPropagation(); joinAction(); }}
              >
                {group.joinPolicy === "OPEN" ? "Join" : "Request to join"}
              </Button>
            )
          ) : null}

          {/* Three-dot menu with all secondary actions */}
          {showMenu || !showJoinActions ? (
            <Dropdown
              open={open}
              onOpenChange={(nextOpen) => {
                if (forceMenuOpen === undefined) {
                  setMenuOpen(nextOpen);
                }
              }}
            >
              <DropdownTrigger asChild iconOnly aria-label={`Options for ${group.name}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-ink-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  ⋯
                </Button>
              </DropdownTrigger>
              <DropdownMenu ariaLabel={`${group.name} menu`}>
                <DropdownItem asChild>
                  <Link href={`/groups/${group.id}`}>View details</Link>
                </DropdownItem>
                {canManageMembers ? (
                  <DropdownItem onClick={onManageMembers}>View members</DropdownItem>
                ) : null}
                {canManageGroup ? <DropdownItem onClick={onEdit}>Edit</DropdownItem> : null}
                {canManageGroup ? (
                  isArchived ? (
                    <DropdownItem onClick={onRestore}>Restore</DropdownItem>
                  ) : (
                    <DropdownItem onClick={onArchive}>Archive</DropdownItem>
                  )
                ) : null}
                {isMember && !isArchived ? (
                  <DropdownItem
                    onClick={onLeave}
                    className="text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50"
                  >
                    Leave group
                  </DropdownItem>
                ) : null}
              </DropdownMenu>
            </Dropdown>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
