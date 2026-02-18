import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/app/page-shell";
import ChatView from "@/components/chat/ChatView";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { getGroupMembership, getParishMembership, isCoordinatorForGroup } from "@/server/db/groups";
import { canModerateChatChannel, canPostGroupChannel, isParishLeader } from "@/lib/permissions";
import { listChannelsForUser, listMessages, getPinnedMessage, getLastReadAt, getChannelReadIndicatorSnapshot } from "@/lib/queries/chat";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { buildAvatarImagePath } from "@/lib/storage/avatar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GroupChatPageProps = {
  params: Promise<{ locale: string; groupId: string }>;
};

export default async function GroupChatPage({ params }: GroupChatPageProps) {
  const rawParams = await params;
  const locale = getLocaleFromParam(rawParams.locale);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    redirect(buildLocalePathname(locale, "/sign-in"));
  }

  const { groupId } = rawParams;
  const parishId = session.user.activeParishId;
  const userId = session.user.id;

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      parishId
    },
    select: {
      id: true,
      name: true,
      avatarKey: true
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
    redirect(buildLocalePathname(locale, "/access"));
  }

  const isLeader = isParishLeader(parishMembership.role);
  const isMember = Boolean(groupMembership && groupMembership.status === "ACTIVE");

  if (!isLeader && !isMember) {
    notFound();
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
        name: group.name,
        avatarUrl: group.avatarKey ? buildAvatarImagePath(group.avatarKey) : null
      },
      isMember: true
    };

  const isCoordinator = await isCoordinatorForGroup(groupId, userId);
  const canModerate = canModerateChatChannel(parishMembership.role, isCoordinator);
  const canPost = canPostGroupChannel(parishMembership.role, isMember);

  const [messages, pinnedMessage, groupMembers, lastReadAt, readIndicatorSnapshot] = await Promise.all([
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
    }),
    getLastReadAt(selectedChannel.id, userId),
    getChannelReadIndicatorSnapshot(parishId, selectedChannel.id, userId)
  ]);

  return (
    <PageShell title="" spacing="compact">
      <ChatView
        channels={channels}
        channel={selectedChannel}
        initialMessages={messages}
        initialPinnedMessage={pinnedMessage}
        canPost={canPost}
        canModerate={canModerate}
        currentUserId={userId}
        parishId={parishId}
        mentionableUsers={groupMembers.map((member) => ({
          id: member.user.id,
          name: member.user.name ?? member.user.email ?? "Parish member",
          email: member.user.email ?? ""
        }))}
        lastReadAt={lastReadAt}
        initialReadIndicatorSnapshot={readIndicatorSnapshot}
      />
    </PageShell>
  );
}
