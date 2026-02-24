import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "@/lib/audit/actions";
import { auditLog } from "@/lib/audit/log";
import {
  consumeLogoutAllDevicesRateLimit,
  resolveRequestClientAddress
} from "@/lib/security/authSessionRateLimit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireAdminOrShepherd(session.user.id, session.user.activeParishId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = consumeLogoutAllDevicesRateLimit({
    userId: session.user.id,
    request
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again shortly.",
        retryAfterSeconds: rateLimit.retryAfterSeconds
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const token = await getToken({ req: request });
  if (!token?.jti) {
    return NextResponse.json(
      { error: "Session token unavailable. Please sign in again." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        authSessionVersion: { increment: 1 },
        authSessionKeepJti: token.jti
      }
    });

    await auditLog(tx, {
      parishId: session.user.activeParishId!,
      actorUserId: session.user.id,
      action: AUDIT_ACTIONS.SECURITY_LOGOUT_ALL_DEVICES,
      targetType: AUDIT_TARGET_TYPES.USER,
      targetId: session.user.id,
      metadata: {
        ip: resolveRequestClientAddress(request),
        userAgent: request.headers.get("user-agent") ?? "unknown",
        keepCurrentSession: true
      }
    });
  });

  return NextResponse.json({ success: true });
}
