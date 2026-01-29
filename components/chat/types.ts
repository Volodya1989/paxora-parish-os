export type ChatChannelSummary = {
  id: string;
  name: string;
  description: string | null;
  type: "ANNOUNCEMENT" | "GROUP" | "PARISH";
  lockedAt: Date | null;
  group: {
    id: string;
    name: string;
  } | null;
  unreadCount?: number | null;
  isMember: boolean;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  editedAt?: Date | null;
  deletedAt: Date | null;
  replyCount: number;
  reactions: {
    emoji: string;
    count: number;
    reactedByMe: boolean;
  }[];
  author: {
    id: string;
    name: string;
  };
  parentMessage: {
    id: string;
    body: string;
    createdAt: Date;
    deletedAt: Date | null;
    author: {
      id: string;
      name: string;
    };
  } | null;
};

export type ChatPinnedMessage = {
  id: string;
  messageId: string;
  pinnedAt: Date;
  pinnedBy: {
    id: string;
    name: string;
  };
  message: ChatMessage;
};

export type ChatChannelMember = {
  userId: string;
  name: string;
  email: string;
  parishRole: "ADMIN" | "SHEPHERD" | "MEMBER";
  channelRole: "MEMBER" | "MODERATOR" | null;
  isMember: boolean;
};
