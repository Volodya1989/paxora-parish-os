export const MAX_CHAT_ATTACHMENTS = 3;
export const MAX_CHAT_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export const CHAT_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];

export function isSupportedChatAttachment(mimeType: string) {
  return CHAT_ATTACHMENT_MIME_TYPES.includes(mimeType);
}
