/**
 * Format a message timestamp in WhatsApp style for display.
 *
 * Formats relative to the current time for recent messages:
 * - Same day: Shows time (e.g., "2:30 PM")
 * - Yesterday: Shows "Yesterday"
 * - This week: Shows day name (e.g., "Mon", "Wed")
 * - Older: Shows date (e.g., "Jan 15")
 *
 * @param date - The message timestamp to format
 * @returns Formatted time string, or empty string if date is null/undefined
 *
 * @example
 * formatMessageTime(new Date()) // "2:30 PM" (if sent today)
 * formatMessageTime(new Date(Date.now() - 86400000)) // "Yesterday" (if sent yesterday)
 * formatMessageTime(null) // ""
 */
export function formatMessageTime(date: Date | null | undefined): string {
  if (!date) return "";

  const now = new Date();
  const messageDate = new Date(date);

  // Reset time portion for accurate day comparison
  now.setHours(0, 0, 0, 0);
  messageDate.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - messageDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day - show time in 12-hour format
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  } else if (diffDays === 1) {
    // Previous day
    return "Yesterday";
  } else if (diffDays < 7) {
    // This week - show day name abbreviation
    return new Date(date).toLocaleDateString("en-US", { weekday: "short" });
  } else {
    // Older messages - show date abbreviation
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}
