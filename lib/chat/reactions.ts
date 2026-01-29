export const REACTION_EMOJIS = ["👍", "❤️", "🙏", "🙂", "😂", "😢"] as const;

export type ChatReactionEmoji = (typeof REACTION_EMOJIS)[number];
