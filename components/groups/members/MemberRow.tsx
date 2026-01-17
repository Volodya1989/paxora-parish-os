"use client";

import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import RoleChip from "@/components/groups/members/RoleChip";
import type { GroupMemberRecord } from "@/lib/queries/members";

const ROLE_TOGGLE_LABELS: Record<GroupMemberRecord["role"], string> = {
  COORDINATOR: "Make parishioner",
  PARISHIONER: "Make coordinator"
};

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
  isBusy
}: MemberRowProps) {
  const displayName = member.name ?? member.email;
  const showActions = canManage && !isSelf;
  const toggleRole = member.role === "COORDINATOR" ? "PARISHIONER" : "COORDINATOR";

  return (
    <div className="flex flex-col gap-2 rounded-card border border-mist-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">{displayName}</p>
          <p className="text-xs text-ink-500">{member.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoleChip role={member.role} />
          {member.parishRole && member.parishRole !== "MEMBER" ? (
            <RoleChip role={member.parishRole} />
          ) : null}
          {showActions ? (
            <Dropdown>
              <DropdownTrigger
                asChild
                iconOnly
                aria-label={`Actions for ${displayName}`}
                disabled={isBusy}
              >
                <button className="rounded-full border border-mist-200 bg-white px-2 py-1 text-xs text-ink-600 shadow-card transition hover:border-mist-300">
                  •••
                </button>
              </DropdownTrigger>
              <DropdownMenu ariaLabel={`Member actions for ${displayName}`}>
                <DropdownItem onClick={() => onChangeRole(toggleRole)}>
                  {ROLE_TOGGLE_LABELS[member.role]}
                </DropdownItem>
                <DropdownItem onClick={onRemove}>Remove from group</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          ) : null}
        </div>
      </div>
    </div>
  );
}
