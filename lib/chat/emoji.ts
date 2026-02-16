const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

export function containsEmoji(text: string) {
  return EMOJI_REGEX.test(text);
}

