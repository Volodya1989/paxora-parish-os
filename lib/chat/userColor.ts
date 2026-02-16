const USER_COLOR_PALETTE = Array.from({ length: 10 }, (_, index) => `var(--chat-name-color-${index})`);

const colorCache = new Map<string, string>();

function hashUserId(userId: string) {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getUserColor(userId: string) {
  if (!userId) {
    return USER_COLOR_PALETTE[0];
  }

  const cached = colorCache.get(userId);
  if (cached) {
    return cached;
  }

  const color = USER_COLOR_PALETTE[hashUserId(userId) % USER_COLOR_PALETTE.length] ?? USER_COLOR_PALETTE[0];
  colorCache.set(userId, color);

  return color;
}

