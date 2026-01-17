"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";
import MemberRow from "@/components/groups/members/MemberRow";
import InviteDrawer from "@/components/groups/members/InviteDrawer";
import PendingInvites from "@/components/groups/members/PendingInvites";
import {
  acceptInvite,
  changeMemberRole,
  declineInvite,
  inviteMember,
  removeMember,
  type MemberActionState
} from "@/app/actions/members";
import type { GroupMemberRecord, PendingInviteRecord } from "@/lib/queries/members";

const EMPTY_MEMBERS_MESSAGE = "Add parishioners to build a calm, coordinated team.";

const handleResult = (
  result: MemberActionState,
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

type GroupMembersViewProps = {
  group: {
    id: string;
    name: string;
    description?: string | null;
  };
  members: GroupMemberRecord[];
  pendingInvites: PendingInviteRecord[];
  canManage: boolean;
  viewer: {
    id: string;
    status: "ACTIVE" | "INVITED" | null;
  };
};

export default function GroupMembersView({
  group,
  members,
  pendingInvites,
  canManage,
  viewer
}: GroupMembersViewProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runAction = async (
    action: () => Promise<MemberActionState>,
    successTitle: string
  ) => {
    const result = await action();
    if (handleResult(result, addToast, "Please try again.")) {
      addToast({
        title: successTitle,
        description: result.message
      });
      refresh();
    }
  };

  const handleInvite = async ({ email, role }: { email: string; role: "LEAD" | "MEMBER" }) => {
    const result = await inviteMember({ groupId: group.id, email, role });
    return result;
  };

  const handleRoleChange = (userId: string, role: "LEAD" | "MEMBER") => {
    setPendingMemberId(userId);
    void runAction(
      async () => {
        const result = await changeMemberRole({ groupId: group.id, userId, role });
        setPendingMemberId(null);
        return result;
      },
      "Role updated"
    );
  };

  const handleRemove = (userId: string) => {
    setPendingMemberId(userId);
    void runAction(
      async () => {
        const result = await removeMember({ groupId: group.id, userId });
        setPendingMemberId(null);
        return result;
      },
      "Member removed"
    );
  };

  const handleAccept = () => {
    void runAction(() => acceptInvite({ groupId: group.id }), "Invite accepted");
  };

  const handleDecline = () => {
    void runAction(() => declineInvite({ groupId: group.id }), "Invite declined");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          title={`${group.name} members`}
          subtitle={group.description ?? "Coordinate ministries with clarity and care."}
        />
        <div className="flex flex-wrap items-center gap-3">
          {canManage ? (
            <Button type="button" onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          ) : null}
          <Link className="text-sm font-medium text-ink-700 underline" href={`/groups/${group.id}`}>
            Back to group
          </Link>
        </div>
      </div>

      {viewer.status === "INVITED" ? (
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">You&apos;re invited</h2>
            <p className="text-sm text-ink-500">
              Accept to join this ministry group, or decline if it&apos;s not the right fit.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleAccept} isLoading={isPending}>
              Accept invite
            </Button>
            <Button type="button" variant="secondary" onClick={handleDecline} disabled={isPending}>
              Decline
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Active members</h2>
          <p className="text-sm text-ink-500">{members.length} total</p>
        </div>
        <div className="mt-4 space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-ink-500">{EMPTY_MEMBERS_MESSAGE}</p>
          ) : (
            members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                canManage={canManage}
                isSelf={member.userId === viewer.id}
                onChangeRole={(role) => handleRoleChange(member.userId, role)}
                onRemove={() => handleRemove(member.userId)}
                isBusy={pendingMemberId === member.userId}
              />
            ))
          )}
        </div>
      </Card>

      {canManage ? (
        <Card>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-ink-900">Pending invites</h2>
            <p className="text-sm text-ink-500">
              Track invitations awaiting a response.
            </p>
          </div>
          <div className="mt-4">
            <PendingInvites invites={pendingInvites} />
          </div>
        </Card>
      ) : null}

      {canManage ? (
        <InviteDrawer
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvite={handleInvite}
        />
      ) : null}
    </div>
  );
}
