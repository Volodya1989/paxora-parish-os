import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type TaskCompletionTemplateInput = {
  parishName: string;
  taskTitle: string;
  completedByName: string;
  taskLink: string;
};

export function renderTaskCompletionEmail({
  parishName,
  taskTitle,
  completedByName,
  taskLink
}: TaskCompletionTemplateInput) {
  const subject = `${completedByName} completed "${taskTitle}"`;
  const previewText = `Task complete: ${taskTitle}`;
  const html = renderEmailLayout({
    title: subject,
    previewText,
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Task completed</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
        <strong>${completedByName}</strong> marked <strong>${taskTitle}</strong> as complete${parishName ? ` for ${parishName}` : ""}.
      </p>
      ${renderButton("View task", taskLink)}
      <p style="margin:24px 0 0;font-size:13px;color:#6B7280;line-height:1.5;">
        If the button doesn’t work, paste this link into your browser: ${taskLink}
      </p>
    `
  });

  const text = [
    subject,
    "",
    `${completedByName} marked "${taskTitle}" as complete${parishName ? ` for ${parishName}` : ""}.`,
    "",
    "View task:",
    taskLink
  ].join("\n");

  return {
    subject,
    html,
    text
  };
}
