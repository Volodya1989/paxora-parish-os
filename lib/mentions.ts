export type MentionEntity = {
  userId: string;
  displayName: string;
  email: string;
  start: number;
  end: number;
};

const MAX_MENTION_LENGTH = 120;

export function normalizeMentionEntities(input: unknown): MentionEntity[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const mention = item as Record<string, unknown>;
      const userId = typeof mention.userId === "string" ? mention.userId.trim() : "";
      const displayName =
        typeof mention.displayName === "string" ? mention.displayName.trim().slice(0, MAX_MENTION_LENGTH) : "";
      const email = typeof mention.email === "string" ? mention.email.trim().slice(0, MAX_MENTION_LENGTH) : "";
      const start = typeof mention.start === "number" ? mention.start : NaN;
      const end = typeof mention.end === "number" ? mention.end : NaN;

      if (!userId || !displayName || !email || !Number.isInteger(start) || !Number.isInteger(end)) {
        return null;
      }

      if (start < 0 || end <= start) return null;

      return { userId, displayName, email, start, end } satisfies MentionEntity;
    })
    .filter((item): item is MentionEntity => Boolean(item))
    .sort((a, b) => a.start - b.start)
    .filter((entity, idx, arr) => {
      if (idx === 0) return true;
      return entity.start >= arr[idx - 1]!.end;
    });
}

export function extractMentionedUserIds(body: string, mentionEntities: MentionEntity[]) {
  const unique = new Set<string>();

  mentionEntities.forEach((mention) => {
    if (mention.end > body.length) return;
    const text = body.slice(mention.start, mention.end);
    if (text !== `@${mention.displayName}`) return;
    unique.add(mention.userId);
  });

  return Array.from(unique);
}

export function mentionSnippet(body: string) {
  const compact = body.trim().replace(/\s+/g, " ");
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}
