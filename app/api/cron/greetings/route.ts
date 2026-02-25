import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireCronSecret } from "@/lib/cron/auth";
import { runGreetingsCronJob } from "@/lib/email/greetingsCron";

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const requestId = request.headers.get("x-request-id") ?? randomUUID();

  try {
    const summary = await runGreetingsCronJob({ requestId });
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown greetings cron error";
    console.error("[greetings-cron] unhandled route error", { requestId, error: message });
    return NextResponse.json(
      {
        requestId,
        error: "Greetings cron failed",
        message
      },
      { status: 500 }
    );
  }
}
