import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import PageShell from "@/components/app/page-shell";
import ChatView from "@/components/chat/ChatView";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { authOptions } from "@/server/auth/options";
import { getParishMembership, isCoordinatorInParish } from "@/server/db/groups";
import { canModerateChatChannel, canPostAnnouncementChannel, isParishLeader } from "@/lib/permissions";
import { listChannelsForUser, listMessages, getPinnedMessage, listChannelMembers, getLastReadAt } from "@/lib/queries/chat";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import { getTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CommunityChatPageProps = {
  searchParams: Promise<{ channel?: string }>;
  params: Promise<{ locale: string }>;
};

export default async function CommunityChatPage({ searchParams, params }: CommunityChatPageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const t = getTranslations(locale);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    redirect(buildLocalePathname(locale, "/sign-in"));
  }

  const { channel: channelIdParam } = await searchParams;
  const parishId = session.user.activeParishId;
  const userId = session.user.id;

  const channels = await listChannelsForUser(parishId, userId);
  const parishChannels = channels.filter((channel) => channel.type !== "GROUP");

  if (channels.length === 0) {
    return (
      <PageShell title="" spacing="compact">
        <Card>
          <CardHeader>
            <CardTitle>{t("chat.noChannelsTitle")}</CardTitle>
            <CardDescription>
              {t("chat.noChannelsDescription")}
            </CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  const availableChannels = parishChannels.length > 0 ? parishChannels : channels;
  const selectedChannel =
    availableChannels.find((channel) => channel.id === channelIdParam) ?? availableChannels[0];

  const parishMembership = await getParishMembership(parishId, userId);

  if (!parishMembership) {
    redirect(buildLocalePathname(locale, "/access"));
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
        parishId={parishId}
        channelMembers={channelMembers}
        mentionableUsers={channelMembers?.map((member) => ({ id: member.userId, name: member.name, email: member.email }))}
        lastReadAt={lastReadAt}
      />
    </PageShell>
  );
}
