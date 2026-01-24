type ResendEmailInput = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type ResendResponse = {
  id: string;
};

export async function sendResendEmail(input: ResendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend error ${response.status}: ${message}`);
  }

  const data = (await response.json()) as ResendResponse;
  return data.id;
}
