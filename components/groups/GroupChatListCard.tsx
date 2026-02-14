import Link from "next/link";
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
  className
}: GroupChatListCardProps) {
  return (
    <Link
      href={href}
      className="block transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <GroupListRow
        name={name}
        avatarUrl={avatarUrl}
        description={description}
        lastMessage={lastMessage}
        lastMessageAuthor={lastMessageAuthor}
        lastMessageTime={lastMessageTime}
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-mist-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:border-mist-200 hover:shadow-md",
          className
        )}
        right={(
          <>
            {unreadCount && unreadCount > 0 ? <Badge tone="warning">{unreadCount}</Badge> : null}
            <span className="text-ink-400 transition-transform group-hover:translate-x-0.5">›</span>
          </>
        )}
      />
    </Link>
  );
}
