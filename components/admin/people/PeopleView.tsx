"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ParishRole } from "@prisma/client";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SectionTitle from "@/components/ui/SectionTitle";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import { useToast } from "@/components/ui/Toast";
import RoleChip from "@/components/groups/members/RoleChip";
import { removeMember, updateMemberRole } from "@/app/actions/people";
import type { ParishMemberRecord } from "@/lib/queries/people";
import type { PeopleActionState } from "@/lib/types/people";

const roleOptions: Array<{ role: ParishRole; label: string }> = [
  { role: "ADMIN", label: "Admin" },
  { role: "SHEPHERD", label: "Clergy" },
  { role: "MEMBER", label: "Parishioner" }
];

const invitesEnabled = false;

const handleResult = (
  result: PeopleActionState,
  addToast: ReturnType<typeof useToast>["addToast"],
  fallback: string
) => {
  if (result.status === "error") {
    addToast({
      title: "Update failed",
      description: result.message || fallback
    });
    return false;
  }
  return true;
};

type PeopleViewProps = {
  members: ParishMemberRecord[];
  viewerId: string;
};

export default function PeopleView({ members, viewerId }: PeopleViewProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ParishMemberRecord | null>(null);
  const [, startTransition] = useTransition();

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runAction = async (action: () => Promise<PeopleActionState>, successTitle: string) => {
    const result = await action();
    if (handleResult(result, addToast, "Please try again.")) {
      addToast({
        title: successTitle,
        description: result.message
      });
      refresh();
    }
  };

  const handleRoleChange = (memberId: string, role: ParishRole) => {
    setPendingMemberId(memberId);
    void runAction(
      async () => {
        const result = await updateMemberRole({ memberId, role });
        setPendingMemberId(null);
        return result;
      },
      "Role updated"
    );
  };

  const handleRemove = (member: ParishMemberRecord) => {
    setRemoveTarget(member);
  };

  const handleRemoveConfirm = () => {
    if (!removeTarget) {
      return;
    }
    const memberId = removeTarget.id;
    setRemoveTarget(null);
    setPendingMemberId(memberId);
    void runAction(
      async () => {
        const result = await removeMember({ memberId });
        setPendingMemberId(null);
        return result;
      },
      "Member removed"
    );
  };

  const removeName = removeTarget?.name ?? removeTarget?.email ?? "this member";

  const memberRows = members.map((member) => {
    const displayName = member.name ?? member.email;
    const isBusy = pendingMemberId === member.id;
    return (
      <div
        key={member.id}
        className="flex flex-col gap-2 rounded-card border border-mist-200 bg-white px-4 py-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">{displayName}</p>
            <p className="text-xs text-ink-500">{member.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleChip role={member.role} />
            <Badge tone="success">Active</Badge>
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
                {roleOptions.map((option) => (
                  <DropdownItem
                    key={option.role}
                    onClick={() => handleRoleChange(member.id, option.role)}
                    disabled={option.role === member.role || isBusy}
                  >
                    Make {option.label}
                  </DropdownItem>
                ))}
                <DropdownItem onClick={() => handleRemove(member)} disabled={isBusy}>
                  Remove access
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        {member.userId === viewerId ? (
          <p className="text-xs text-ink-400">
            You are signed in as this member.
          </p>
        ) : null}
      </div>
    );
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="People"
        subtitle="Manage parish members, permissions, and access to your community."
      />

      <Card>
        <div className="space-y-6">
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>{members.length} total members</CardDescription>
          </CardHeader>
          {members.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Invite parishioners to start coordinating people and roles."
              action={
                <Button type="button" variant="secondary" disabled>
                  Invite member
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">{memberRows}</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-6">
          <CardHeader>
            <CardTitle>Invites</CardTitle>
            <CardDescription>Track outstanding invitations to join your parish.</CardDescription>
          </CardHeader>
          {invitesEnabled ? (
            <EmptyState
              title="No pending invites"
              description="Invites will appear here once they are sent."
            />
          ) : (
            <div className="rounded-card border border-dashed border-mist-200 bg-mist-50/70 px-4 py-5 text-sm text-ink-500">
              <p className="font-medium text-ink-700">Invites are not yet available.</p>
              <p className="mt-1">
                TODO: Enable parish invite infrastructure before exposing the invite flow.
              </p>
              <div className="mt-4">
                <Button type="button" variant="secondary" disabled>
                  Invite member
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-6">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage parish account sessions for this admin team.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4">
            <div>
              <p className="text-sm font-medium text-ink-900">Log out of all devices</p>
              <p className="text-sm text-ink-500">
                Requires session management support to revoke all active sessions.
              </p>
            </div>
            <Button type="button" variant="secondary" disabled>
              Log out all devices
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove member"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleRemoveConfirm}>
              Remove access
            </Button>
          </>
        }
      >
        <p>
          Remove {removeName} from this parish? They will lose access immediately.
        </p>
      </Modal>

      <Drawer
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove member"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleRemoveConfirm}>
              Remove access
            </Button>
          </>
        }
      >
        <p>
          Remove {removeName} from this parish? They will lose access immediately.
        </p>
      </Drawer>
    </div>
  );
}
