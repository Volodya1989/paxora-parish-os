const INVALID_SEGMENTS = new Set(["undefined", "null"]);

/**
 * Notifications may be stored with legacy or malformed href values.
 * Only allow internal app routes.
 */
export function getSafeNotificationHref(href: string | null | undefined): string | null {
  if (typeof href !== "string") return null;

  const trimmed = href.trim();
  if (!trimmed.startsWith("/")) return null;

  const [path] = trimmed.split(/[?#]/);
  if (!path) return null;

  const segments = path.split("/").filter(Boolean);
  if (segments.some((segment) => INVALID_SEGMENTS.has(segment.toLowerCase()))) {
    return null;
  }

  return trimmed;
}

