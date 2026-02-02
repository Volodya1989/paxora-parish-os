import { getServerSession } from "next-auth";
import PageShell from "@/components/app/page-shell";
import ChatView from "@/components/chat/ChatView";
import { authOptions } from "@/server/auth/options";
import { getParishMembership, isCoordinatorInParish } from "@/server/db/groups";
import { canModerateChatChannel, canPostAnnouncementChannel, isParishLeader } from "@/lib/permissions";
import { listChannelsForUser, listMessages, getPinnedMessage, listChannelMembers, getLastReadAt } from "@/lib/queries/chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CommunityChatPageProps = {
  searchParams: Promise<{ channel?: string }>;
};

export default async function CommunityChatPage({ searchParams }: CommunityChatPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const { channel: channelIdParam } = await searchParams;
  const parishId = session.user.activeParishId;
  const userId = session.user.id;

  const channels = await listChannelsForUser(parishId, userId);
  const parishChannels = channels.filter((channel) => channel.type !== "GROUP");

  if (parishChannels.length === 0) {
    throw new Error("No channels available");
  }

  const selectedChannel =
    parishChannels.find((channel) => channel.id === channelIdParam) ?? parishChannels[0];

  const parishMembership = await getParishMembership(parishId, userId);

  if (!parishMembership) {
    throw new Error("Unauthorized");
  }

  const isLeader = isParishLeader(parishMembership.role);
  const isCoordinator = await isCoordinatorInParish(parishId, userId);

  const canModerate = canModerateChatChannel(parishMembership.role, isCoordinator);

  let canPost = true;
  if (selectedChannel.type === "ANNOUNCEMENT") {
    canPost = canPostAnnouncementChannel(parishMembership.role, isCoordinator);
  }
  if (selectedChannel.type === "PARISH") {
    canPost = isLeader || selectedChannel.isMember;
  }

  const [messages, pinnedMessage, channelMembers, lastReadAt] = await Promise.all([
    listMessages({ channelId: selectedChannel.id, userId }),
    getPinnedMessage(selectedChannel.id, userId),
    selectedChannel.type !== "GROUP"
      ? listChannelMembers(parishId, selectedChannel.id)
      : Promise.resolve(undefined),
    getLastReadAt(selectedChannel.id, userId)
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
        channelMembers={channelMembers}
        mentionableUsers={channelMembers?.map((member) => ({ id: member.userId, name: member.name }))}
        lastReadAt={lastReadAt}
      />
    </PageShell>
  );
}
