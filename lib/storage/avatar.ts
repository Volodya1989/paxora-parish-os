import { randomUUID } from "crypto";

export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function isSupportedAvatarMimeType(mimeType: string) {
  return AVATAR_MIME_TYPES.includes(mimeType as (typeof AVATAR_MIME_TYPES)[number]);
}

export function avatarExtensionFromMime(mimeType: string) {
  return EXTENSION_MAP[mimeType] ?? null;
}

export function buildUserAvatarKey(userId: string, extension: string) {
  return `users/${userId}/avatar/${randomUUID()}.${extension}`;
}

export function buildGroupAvatarKey(groupId: string, extension: string) {
  return `groups/${groupId}/avatar/${randomUUID()}.${extension}`;
}

export function buildAvatarImagePath(key: string) {
  return `/api/images/${key}`;
}
