"use client";

import Button from "@/components/ui/Button";
import RoleChip from "@/components/groups/members/RoleChip";
import Badge from "@/components/ui/Badge";
import { useLocale, useTranslations } from "@/lib/i18n/provider";
import type { PendingInviteRecord } from "@/lib/queries/members";

const formatInvitedBy = (
  invite: PendingInviteRecord,
  t: ReturnType<typeof useTranslations>,
) => {
  if (invite.status === "REQUESTED") {
    return t("groups.membersPage.requestedToJoin");
  }
  if (!invite.invitedBy) {
    return t("groups.membersPage.sentByCoordinator");
  }
  return t("groups.membersPage.sentBy").replace(
    "{name}",
    invite.invitedBy.name ?? invite.invitedBy.email,
  );
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
  isBusy,
}: PendingInvitesProps) {
  const t = useTranslations();
  const locale = useLocale();

  if (invites.length === 0) {
    return (
      <p className="text-sm text-ink-500">{t("groups.membersPage.emptyPending")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => {
        const busy = isBusy ? isBusy(invite.userId) : false;
        const statusLabel =
          invite.status === "REQUESTED"
            ? t("groups.membersPage.requested")
            : t("groups.membersPage.invited");
        return (
          <div
            key={invite.id}
            className="rounded-card border border-mist-200 bg-white px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  {invite.name ?? invite.email}
                </p>
                <p className="break-all text-xs text-ink-500">{invite.email}</p>
                <p className="text-xs text-ink-500">{formatInvitedBy(invite, t)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-ink-400">
                <RoleChip role={invite.role} />
                <Badge tone={invite.status === "REQUESTED" ? "warning" : "neutral"}>
                  {statusLabel}
                </Badge>
                <span>
                  {statusLabel}{" "}
                  {invite.createdAt.toLocaleDateString(locale, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
            {canManage ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {invite.status === "REQUESTED" ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onApprove(invite.userId)}
                      disabled={busy}
                    >
                      {t("groups.membersPage.approve")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onDeny(invite.userId)}
                      disabled={busy}
                    >
                      {t("groups.membersPage.deny")}
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
                    {t("groups.membersPage.cancelInvite")}
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
