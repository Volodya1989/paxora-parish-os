"use client";

import type { ReactNode } from "react";
import Badge from "@/components/ui/Badge";
import GroupListRow from "@/components/groups/GroupListRow";
import { cn } from "@/lib/ui/cn";

type GroupChatListCardProps = {
  name: string;
  avatarUrl?: string | null;
  description?: string | null;
  lastMessage?: string | null;
  lastMessageAuthor?: string | null;
  lastMessageTime?: Date | null;
  unreadCount?: number | null;
  href: string;
  className?: string;
  meta?: ReactNode;
  menu?: ReactNode;
  showChevron?: boolean;
};

export default function GroupChatListCard({
  name,
  avatarUrl,
  description,
  lastMessage,
  lastMessageAuthor,
  lastMessageTime,
  unreadCount,
  href,
  className,
  meta,
  menu,
  showChevron = true
}: GroupChatListCardProps) {
  const navigateToChat = (event: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window === "undefined") {
      return;
    }

    const target = event.target as HTMLElement | null;
    const interactiveTarget = target?.closest(
      "button, a, input, textarea, select, [role='button'], [role='menuitem']"
    );

    if (interactiveTarget && interactiveTarget !== event.currentTarget) {
      return;
    }

    window.location.href = href;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (typeof window !== "undefined") {
        window.location.href = href;
      }
    }
  };

  return (
    <div
      className="block transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
      role="button"
      tabIndex={0}
      onClick={navigateToChat}
      onKeyDown={handleKeyDown}
    >
      <GroupListRow
        name={name}
        avatarUrl={avatarUrl}
        description={description}
        lastMessage={lastMessage}
        lastMessageAuthor={lastMessageAuthor}
        lastMessageTime={lastMessageTime}
        meta={meta}
        className={cn(
          "group flex cursor-pointer items-center gap-3 rounded-xl border border-mist-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:border-mist-200 hover:shadow-md",
          className
        )}
        right={(
          <>
            {unreadCount && unreadCount > 0 ? <Badge tone="warning">{unreadCount}</Badge> : null}
            {menu}
            {showChevron ? <span className="text-ink-400 transition-transform group-hover:translate-x-0.5">›</span> : null}
          </>
        )}
      />
    </div>
  );
}
