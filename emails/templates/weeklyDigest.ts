import { renderButton, renderEmailLayout, renderList } from "@/emails/templates/base";
import type { ThisWeekData } from "@/lib/queries/this-week";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

type WeeklyDigestInput = {
  appUrl: string;
  parishName: string;
  data: ThisWeekData;
};

export function renderWeeklyDigestEmail({ appUrl, parishName, data }: WeeklyDigestInput) {
  const tasks = data.tasks.slice(0, 6).map((task) => {
    const due = task.dueBy ? dateFormatter.format(task.dueBy) : "No due date";
    return `${task.title} · due ${due}`;
  });

  const events = data.events.slice(0, 6).map((event) => {
    const start = dateTimeFormatter.format(event.startsAt);
    return `${event.title} · ${start}`;
  });

  const announcements = data.announcements.slice(0, 6).map((announcement) => {
    const posted = announcement.publishedAt ?? announcement.updatedAt ?? announcement.createdAt;
    const dateLabel = dateFormatter.format(posted);
    return `${announcement.title} · ${dateLabel}`;
  });

  const summary = `${data.stats.tasksDone}/${data.stats.tasksTotal} tasks completed · ${data.events.length} events · ${data.announcements.length} announcements`;

  const html = renderEmailLayout({
    title: `Weekly digest · ${parishName}`,
    previewText: `Your weekly digest for ${parishName}.`,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Weekly digest</h1>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        ${parishName} · Week of ${dateFormatter.format(data.week.startsOn)}
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${summary}</p>

      <h2 style="margin:0 0 8px;font-size:16px;color:#111827;">Tasks</h2>
      ${renderList(tasks)}

      <h2 style="margin:20px 0 8px;font-size:16px;color:#111827;">Events</h2>
      ${renderList(events)}

      <h2 style="margin:20px 0 8px;font-size:16px;color:#111827;">Announcements</h2>
      ${renderList(announcements)}

      <div style="margin-top:24px;">
        ${renderButton("Open This Week", `${appUrl}/this-week`)}
      </div>
    `
  });

  const text = [
    `Weekly digest · ${parishName}`,
    `Week of ${dateFormatter.format(data.week.startsOn)}`,
    summary,
    "",
    "Tasks:",
    tasks.length ? tasks.map((task) => `- ${task}`).join("\n") : "None this week.",
    "",
    "Events:",
    events.length ? events.map((event) => `- ${event}`).join("\n") : "None this week.",
    "",
    "Announcements:",
    announcements.length ? announcements.map((announcement) => `- ${announcement}`).join("\n") : "None this week.",
    "",
    `${appUrl}/this-week`
  ].join("\n");

  return {
    subject: `Paxora weekly digest · ${parishName}`,
    html,
    text
  };
}
