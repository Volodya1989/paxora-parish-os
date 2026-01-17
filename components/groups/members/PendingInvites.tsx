import RoleChip from "@/components/groups/members/RoleChip";
import type { PendingInviteRecord } from "@/lib/queries/members";

const formatInvitedBy = (invite: PendingInviteRecord) => {
  if (!invite.invitedBy) {
    return "Sent by a coordinator";
  }
  return `Sent by ${invite.invitedBy.name ?? invite.invitedBy.email}`;
};

type PendingInvitesProps = {
  invites: PendingInviteRecord[];
};

export default function PendingInvites({ invites }: PendingInvitesProps) {
  if (invites.length === 0) {
    return <p className="text-sm text-ink-500">No pending invites.</p>;
  }

  return (
    <div className="space-y-2">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mist-200 bg-white px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-ink-900">{invite.email}</p>
            <p className="text-xs text-ink-500">{formatInvitedBy(invite)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
            <RoleChip role={invite.role} />
            <span>
              Invited {invite.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
