import { analytics } from "@/lib/analytics";

export const analyticsEventNames = {
  rsvpSubmitted: "rsvp_submitted",
  taskCompleted: "task_completed",
  chatMessageSent: "chat_message_sent"
} as const;

export function trackRsvpSubmitted(properties: {
  eventId: string;
  response: "YES" | "MAYBE" | "NO";
}) {
  analytics.track(analyticsEventNames.rsvpSubmitted, properties);
}

export function trackTaskCompleted(properties: {
  taskId: string;
  hoursMode: "estimated" | "manual" | "skip";
  hadManualHours: boolean;
}) {
  analytics.track(analyticsEventNames.taskCompleted, properties);
}

export function trackChatMessageSent(properties: {
  channelId: string;
  hasAttachments: boolean;
  isReply: boolean;
  mentionCount: number;
}) {
  analytics.track(analyticsEventNames.chatMessageSent, properties);
}

