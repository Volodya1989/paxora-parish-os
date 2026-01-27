"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import MemberRow from "@/components/groups/members/MemberRow";
import InviteDrawer from "@/components/groups/members/InviteDrawer";
import PendingInvites from "@/components/groups/members/PendingInvites";
import { useTranslations } from "@/lib/i18n/provider";
import {
  acceptInvite,
  approveJoinRequest,
  cancelInvite,
  changeMemberRole,
  declineInvite,
  denyJoinRequest,
  inviteMember,
  joinGroup,
  leaveGroup,
  removeMember,
  requestToJoin
} from "@/app/actions/members";
import type { GroupMemberRecord, PendingInviteRecord } from "@/lib/queries/members";
import type { MemberActionState } from "@/lib/types/members";

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
    visibility: "PUBLIC" | "PRIVATE";
    joinPolicy: "INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN";
  };
  members: GroupMemberRecord[];
  pendingInvites: PendingInviteRecord[];
  canManage: boolean;
  viewer: {
    id: string;
    status: "ACTIVE" | "INVITED" | "REQUESTED" | null;
  };
};

export default function GroupMembersView({
  group,
  members,
  pendingInvites,
  canManage,
  viewer
}: GroupMembersViewProps) {
  const t = useTranslations();
  const { addToast } = useToast();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "pending">("members");
  const [query, setQuery] = useState("");
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

  const handleInvite = async ({
    email,
    role
  }: {
    email: string;
    role: "COORDINATOR" | "PARISHIONER";
  }) => {
    const result = await inviteMember({ groupId: group.id, email, role });
    return result;
  };

  const handleRoleChange = (userId: string, role: "COORDINATOR" | "PARISHIONER") => {
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

  const handleCancelInvite = (userId: string) => {
    setPendingMemberId(userId);
    void runAction(
      async () => {
        const result = await cancelInvite({ groupId: group.id, userId });
        setPendingMemberId(null);
        return result;
      },
      "Invite cancelled"
    );
  };

  const handleAccept = () => {
    void runAction(() => acceptInvite({ groupId: group.id }), "Invite accepted");
  };

  const handleDecline = () => {
    void runAction(() => declineInvite({ groupId: group.id }), "Invite declined");
  };

  const handleJoin = () => {
    void runAction(() => joinGroup({ groupId: group.id }), "Joined group");
  };

  const handleRequestJoin = () => {
    void runAction(() => requestToJoin({ groupId: group.id }), "Request sent");
  };

  const handleLeave = () => {
    void runAction(() => leaveGroup({ groupId: group.id }), "Left group");
  };

  const handleApprove = (userId: string) => {
    setPendingMemberId(userId);
    void runAction(
      async () => {
        const result = await approveJoinRequest({ groupId: group.id, userId });
        setPendingMemberId(null);
        return result;
      },
      "Request approved"
    );
  };

  const handleDeny = (userId: string) => {
    setPendingMemberId(userId);
    void runAction(
      async () => {
        const result = await denyJoinRequest({ groupId: group.id, userId });
        setPendingMemberId(null);
        return result;
      },
      "Request denied"
    );
  };

  const joinLabel =
    group.joinPolicy === "OPEN" ? "Join instantly" : "Request approval";
  const canJoin =
    viewer.status === null && (group.joinPolicy === "OPEN" || group.joinPolicy === "REQUEST_TO_JOIN");

  const filteredMembers = useMemo(() => {
    if (!query.trim()) {
      return members;
    }
    const normalized = query.trim().toLowerCase();
    return members.filter((member) => {
      const haystack = `${member.name ?? ""} ${member.email}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [members, query]);

  const filteredPending = useMemo(() => {
    if (!query.trim()) {
      return pendingInvites;
    }
    const normalized = query.trim().toLowerCase();
    return pendingInvites.filter((invite) => {
      const haystack = `${invite.name ?? ""} ${invite.email}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [pendingInvites, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle
          title={`${group.name} members`}
          subtitle={group.description ?? "Coordinate ministries with clarity and care."}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={group.visibility === "PUBLIC" ? "success" : "neutral"}>
            {group.visibility === "PUBLIC" ? t("common.public") : t("common.private")}
          </Badge>
          <Badge tone="neutral">
            {group.joinPolicy === "OPEN"
              ? "Join instantly"
              : group.joinPolicy === "REQUEST_TO_JOIN"
              ? "Request approval"
              : "Invite only"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <Button type="button" onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          ) : null}
          {viewer.status === "ACTIVE" ? (
            <Button type="button" variant="ghost" onClick={handleLeave}>
              Leave group
            </Button>
          ) : null}
          {viewer.status === null && canJoin ? (
            <Button type="button" onClick={group.joinPolicy === "OPEN" ? handleJoin : handleRequestJoin}>
              {joinLabel}
            </Button>
          ) : null}
          {viewer.status === "REQUESTED" ? (
            <Badge tone="warning">Request sent</Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="text-sm font-medium text-ink-700 underline"
            href={`/groups/${group.id}/tasks`}
          >
            Opportunities to Help
          </Link>
          <Link className="text-sm font-medium text-ink-700 underline" href={`/groups/${group.id}`}>
            Back to group
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-medium text-ink-600 shadow-card"
          href="/announcements"
        >
          Announcements
        </Link>
        <Link
          className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-medium text-ink-600 shadow-card"
          href="/calendar"
        >
          Schedule
        </Link>
        <Link
          className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-medium text-ink-600 shadow-card"
          href={`/groups/${group.id}/tasks`}
        >
          Opportunities to Help
        </Link>
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

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Team directory</h2>
            <p className="text-sm text-ink-500">
              Search members and review pending requests in one place.
            </p>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search members"
            aria-label="Search members"
            className="w-full md:w-64"
          />
        </div>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "members" | "pending")}>
          <TabsList>
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingInvites.length})</TabsTrigger>
          </TabsList>
          <TabsPanel value="members">
            <div className="space-y-3">
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-ink-500">{EMPTY_MEMBERS_MESSAGE}</p>
              ) : (
                filteredMembers.map((member) => (
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
          </TabsPanel>
          <TabsPanel value="pending">
            <PendingInvites
              invites={filteredPending}
              canManage={canManage}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onRemove={handleCancelInvite}
              isBusy={(userId) => pendingMemberId === userId}
            />
          </TabsPanel>
        </Tabs>
      </Card>

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
