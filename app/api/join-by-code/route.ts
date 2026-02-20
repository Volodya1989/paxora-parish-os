import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth/options";
import { joinParishByCode } from "@/lib/parish/joinByCode";

const joinByCodeSchema = z.object({
  code: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = joinByCodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await joinParishByCode(session.user.id, parsed.data.code);

  if (result.status === "invalid_code") {
    return NextResponse.json({ error: "Invalid parish code" }, { status: 404 });
  }

  return NextResponse.json({ status: result.status, parishId: result.parishId }, { status: 200 });
}
