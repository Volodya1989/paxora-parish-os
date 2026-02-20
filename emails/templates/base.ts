type EmailLayoutInput = {
  title: string;
  previewText?: string;
  content: string;
};

export function renderEmailLayout({ title, previewText, content }: EmailLayoutInput) {
  const preview = previewText
    ? `<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;">${previewText}</span>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
        ${preview}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(20,27,45,0.08);">
                <tr>
                  <td style="padding:32px;">
                    ${content}
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;color:#7b7f8c;">Paxora Parish Center App</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function renderButton(label: string, url: string) {
  return `
    <a href="${url}" style="display:inline-block;background:#1f3a8a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:999px;">
      ${label}
    </a>
  `;
}

export function renderList(items: string[]) {
  if (items.length === 0) {
    return `<p style="margin:12px 0;color:#6b7280;">None this week.</p>`;
  }

  return `
    <ul style="margin:12px 0 0;padding-left:20px;color:#111827;">
      ${items.map((item) => `<li style="margin-bottom:6px;">${item}</li>`).join("")}
    </ul>
  `;
}
