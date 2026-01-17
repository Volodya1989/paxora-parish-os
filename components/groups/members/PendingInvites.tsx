import Button from "@/components/ui/Button";
import RoleChip from "@/components/groups/members/RoleChip";
import Badge from "@/components/ui/Badge";
import type { PendingInviteRecord } from "@/lib/queries/members";

const formatInvitedBy = (invite: PendingInviteRecord) => {
  if (invite.status === "REQUESTED") {
    return "Requested to join";
  }
  if (!invite.invitedBy) {
    return "Sent by a coordinator";
  }
  return `Sent by ${invite.invitedBy.name ?? invite.invitedBy.email}`;
};

type PendingInvitesProps = {
  invites: PendingInviteRecord[];
  canManage: boolean;
  onApprove: (userId: string) => void;
  onDeny: (userId: string) => void;
  onRemove: (userId: string) => void;
  isBusy?: (userId: string) => boolean;
};

export default function PendingInvites({
  invites,
  canManage,
  onApprove,
  onDeny,
  onRemove,
  isBusy
}: PendingInvitesProps) {
  if (invites.length === 0) {
    return <p className="text-sm text-ink-500">No pending invitations or requests.</p>;
  }

  return (
    <div className="space-y-2">
      {invites.map((invite) => {
        const busy = isBusy ? isBusy(invite.userId) : false;
        return (
          <div
            key={invite.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mist-200 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {invite.name ?? invite.email}
              </p>
              <p className="text-xs text-ink-500">{invite.email}</p>
              <p className="text-xs text-ink-500">{formatInvitedBy(invite)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
              <RoleChip role={invite.role} />
              <Badge tone={invite.status === "REQUESTED" ? "warning" : "neutral"}>
                {invite.status === "REQUESTED" ? "Requested" : "Invited"}
              </Badge>
              <span>
                {invite.status === "REQUESTED" ? "Requested" : "Invited"}{" "}
                {invite.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            {canManage ? (
              <div className="flex flex-wrap items-center gap-2">
                {invite.status === "REQUESTED" ? (
                  <>
                    <Button type="button" size="sm" onClick={() => onApprove(invite.userId)} disabled={busy}>
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onDeny(invite.userId)}
                      disabled={busy}
                    >
                      Deny
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onRemove(invite.userId)}
                    disabled={busy}
                  >
                    Cancel invite
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
