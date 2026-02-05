import { renderButton, renderEmailLayout } from "@/emails/templates/base";

type AnnouncementEmailInput = {
  appUrl: string;
  parishName: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  announcementId: string;
};

export function renderAnnouncementEmail({
  appUrl,
  parishName,
  title,
  bodyHtml,
  bodyText,
  announcementId
}: AnnouncementEmailInput) {
  const html = renderEmailLayout({
    title: `${title} · ${parishName}`,
    previewText: bodyText.slice(0, 140),
    content: `
      <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">${escapeHtml(title)}</h1>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">${escapeHtml(parishName)}</p>
      <div style="font-size:15px;color:#374151;line-height:1.6;">
        ${bodyHtml}
      </div>
      <div style="margin-top:24px;">
        ${renderButton("View in Paxora", `${appUrl}/announcements`)}
      </div>
    `
  });

  const text = [
    title,
    parishName,
    "",
    bodyText,
    "",
    `View in Paxora: ${appUrl}/announcements`
  ].join("\n");

  return {
    subject: `${title} · ${parishName}`,
    html,
    text
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
