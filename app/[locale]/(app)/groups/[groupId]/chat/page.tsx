import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import PageShell from "@/components/app/page-shell";
import ChatView from "@/components/chat/ChatView";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembership, getParishMembership, isCoordinatorForGroup } from "@/server/db/groups";
import { canModerateChatChannel, canPostGroupChannel, isParishLeader } from "@/lib/permissions";
import { listChannelsForUser, listMessages, getPinnedMessage } from "@/lib/queries/chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GroupChatPageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupChatPage({ params }: GroupChatPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const { groupId } = await params;
  const parishId = session.user.activeParishId;
  const userId = session.user.id;

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      parishId
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!group) {
    notFound();
  }

  const [parishMembership, groupMembership] = await Promise.all([
    getParishMembership(parishId, userId),
    getGroupMembership(groupId, userId)
  ]);

  if (!parishMembership) {
    throw new Error("Unauthorized");
  }

  const isLeader = isParishLeader(parishMembership.role);
  const isMember = Boolean(groupMembership && groupMembership.status === "ACTIVE");

  if (!isLeader && !isMember) {
    throw new Error("Unauthorized");
  }

  const channelRecord =
    (await prisma.chatChannel.findFirst({
      where: {
        parishId,
        groupId,
        type: "GROUP"
      }
    })) ??
    (await prisma.chatChannel.create({
      data: {
        parishId,
        groupId,
        type: "GROUP",
        name: `${group.name} chat`,
        description: `Updates for ${group.name}`
      }
    }));

  const channels = await listChannelsForUser(parishId, userId);
  const selectedChannel =
    channels.find((channel) => channel.id === channelRecord.id) ?? {
      id: channelRecord.id,
      name: channelRecord.name,
      description: channelRecord.description ?? null,
      type: channelRecord.type,
      lockedAt: channelRecord.lockedAt,
      group: {
        id: group.id,
        name: group.name
      },
      isMember: true
    };

  const isCoordinator = await isCoordinatorForGroup(groupId, userId);
  const canModerate = canModerateChatChannel(parishMembership.role, isCoordinator);
  const canPost = canPostGroupChannel(parishMembership.role, isMember);

  const [messages, pinnedMessage, groupMembers] = await Promise.all([
    listMessages({ channelId: selectedChannel.id, userId }),
    getPinnedMessage(selectedChannel.id, userId),
    prisma.groupMembership.findMany({
      where: {
        groupId,
        status: "ACTIVE"
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  ]);

  return (
    <PageShell
      title={`${selectedChannel.group?.name ?? "Group"} chat`}
      description="Coordinate within your group in a dedicated room."
    >
      <ChatView
        channels={channels}
        channel={selectedChannel}
        initialMessages={messages}
        initialPinnedMessage={pinnedMessage}
        canPost={canPost}
        canModerate={canModerate}
        currentUserId={userId}
        mentionableUsers={groupMembers.map((member) => ({
          id: member.user.id,
          name: member.user.name ?? member.user.email ?? "Parish member"
        }))}
      />
    </PageShell>
  );
}
