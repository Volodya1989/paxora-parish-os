import type { ReactNode } from "react";
import { formatMessageTime } from "@/lib/time/messageTime";

type GroupListRowProps = {
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageAuthor?: string | null;
  lastMessageTime?: Date | null;
  description?: string | null;
  meta?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export default function GroupListRow({
  name,
  avatarUrl,
  lastMessage,
  lastMessageAuthor,
  lastMessageTime,
  description,
  meta,
  right,
  className
}: GroupListRowProps) {
  return (
    <div className={className ?? "group flex items-center gap-3 rounded-xl border border-mist-100 bg-white px-4 py-3 shadow-sm"}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          name.slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-ink-900">{name}</p>
          {meta}
        </div>
        {lastMessage ? (
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-sm text-ink-500">
              {lastMessageAuthor ? `${lastMessageAuthor}: ` : ""}
              {lastMessage}
            </p>
            <span className="shrink-0 text-xs text-ink-400">{formatMessageTime(lastMessageTime)}</span>
          </div>
        ) : description ? (
          <p className="truncate text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}
