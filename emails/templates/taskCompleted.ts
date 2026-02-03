import { renderEmailLayout, renderButton } from "@/emails/templates/base";

type TaskCompletedEmailInput = {
  appUrl: string;
  taskTitle: string;
  completedByName: string;
  parishName: string;
};

export function renderTaskCompletedEmail({
  appUrl,
  taskTitle,
  completedByName,
  parishName
}: TaskCompletedEmailInput) {
  const subject = `Serve task completed: ${taskTitle}`;
  const serveBoardUrl = `${appUrl}/serve-board`;

  const content = `
    <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Task completed</h1>
    <p style="margin:0 0 8px;color:#374151;font-size:14px;">
      <strong>${completedByName}</strong> marked <strong>${taskTitle}</strong> as completed in ${parishName}.
    </p>
    <p style="margin:16px 0;">
      ${renderButton("View Serve Board", serveBoardUrl)}
    </p>
  `;

  const html = renderEmailLayout({
    title: subject,
    previewText: `${completedByName} completed "${taskTitle}"`,
    content
  });

  const text = `${completedByName} marked "${taskTitle}" as completed in ${parishName}. View the serve board at ${serveBoardUrl}`;

  return { subject, html, text };
}
