"use client";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/ui/Dropdown";
import RoleChip from "@/components/groups/members/RoleChip";
import { useTranslations } from "@/lib/i18n/provider";
import type { GroupMemberRecord } from "@/lib/queries/members";

type MemberRowProps = {
  member: GroupMemberRecord;
  canManage: boolean;
  isSelf: boolean;
  onChangeRole: (role: "COORDINATOR" | "PARISHIONER") => void;
  onRemove: () => void;
  isBusy?: boolean;
};

export default function MemberRow({
  member,
  canManage,
  isSelf,
  onChangeRole,
  onRemove,
  isBusy,
}: MemberRowProps) {
  const t = useTranslations();
  const displayName = member.name ?? member.email;
  const showActions = canManage && !isSelf;
  const toggleRole =
    member.role === "COORDINATOR" ? "PARISHIONER" : "COORDINATOR";

  return (
    <div className="rounded-card border border-mist-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">{displayName}</p>
          <p className="break-all text-xs text-ink-500">{member.email}</p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="flex flex-col items-end gap-1">
            <RoleChip role={member.role} />
            {member.parishRole && member.parishRole !== "MEMBER" ? (
              <RoleChip role={member.parishRole} />
            ) : null}
          </div>
          {showActions ? (
            <Dropdown>
              <DropdownTrigger
                asChild
                iconOnly
                aria-label={t("groups.membersPage.memberActionsAria").replace(
                  "{name}",
                  displayName,
                )}
                disabled={isBusy}
              >
                <button className="flex h-9 w-9 items-center justify-center rounded-full border border-mist-200 bg-white text-sm text-ink-700 shadow-card transition hover:border-mist-300">
                  •••
                </button>
              </DropdownTrigger>
              <DropdownMenu
                ariaLabel={t("groups.membersPage.memberActionsAria").replace(
                  "{name}",
                  displayName,
                )}
              >
                <DropdownItem onClick={() => onChangeRole(toggleRole)}>
                  {member.role === "COORDINATOR"
                    ? t("groups.membersPage.makeParishioner")
                    : t("groups.membersPage.makeCoordinator")}
                </DropdownItem>
                <DropdownItem onClick={onRemove}>
                  {t("groups.membersPage.removeFromGroup")}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          ) : null}
        </div>
      </div>
    </div>
  );
}
