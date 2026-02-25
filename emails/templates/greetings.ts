import { renderEmailLayout } from "@/emails/templates/base";
import { stripHtmlToText } from "@/lib/sanitize/html";

function applyTemplatePlaceholders(template: string, input: { firstName: string; parishName: string }) {
  return template
    .replaceAll("{firstName}", input.firstName)
    .replaceAll("{parishName}", input.parishName);
}

export function renderGreetingEmail(input: {
  type: "birthday" | "anniversary";
  firstName: string;
  parishName: string;
  templateHtml: string | null;
  logoUrl: string | null;
  profileUrl: string;
}) {
  const fallbackBody =
    input.type === "birthday"
      ? `<p>Happy Birthday, ${input.firstName}! Your ${input.parishName} family is praying for you today.</p>`
      : `<p>Happy Anniversary, ${input.firstName}! ${input.parishName} celebrates with you.</p>`;

  const body = applyTemplatePlaceholders(input.templateHtml ?? fallbackBody, {
    firstName: input.firstName,
    parishName: input.parishName
  });

  const logoSection = input.logoUrl
    ? `<div style="margin-bottom:16px;"><img src="${input.logoUrl}" alt="${input.parishName} logo" style="max-height:56px;max-width:220px;object-fit:contain;" /></div>`
    : "";

  const content = `${logoSection}${body}<p style="margin-top:16px;"><a href="${input.profileUrl}">Manage greeting preferences</a></p>`;

  return {
    subject: input.type === "birthday" ? `Happy Birthday from ${input.parishName}` : `Happy Anniversary from ${input.parishName}`,
    html: renderEmailLayout({
      title: input.type === "birthday" ? "Happy Birthday" : "Happy Anniversary",
      previewText: input.type === "birthday" ? "A birthday greeting from your parish" : "An anniversary greeting from your parish",
      content
    }),
    text: stripHtmlToText(content)
  };
}
