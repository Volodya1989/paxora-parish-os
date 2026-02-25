import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth/options";
import { joinParishByCode } from "@/lib/parish/joinByCode";
import { prisma } from "@/server/db/prisma";
import {
  selectJoinRequestAdminRecipients,
  sendJoinRequestAdminNotificationEmail,
  sendJoinRequestSubmittedEmail
} from "@/lib/email/joinRequests";
import { notifyParishJoinRequestInApp } from "@/lib/notifications/notify";
import { notifyParishJoinRequest } from "@/lib/push/notify";

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

  if (result.status === "request_created") {
    const requestRecord = await prisma.accessRequest.findUnique({
      where: {
        parishId_userId: {
          parishId: result.parishId,
          userId: session.user.id
        }
      },
      include: {
        parish: { select: { name: true } },
        user: { select: { email: true, name: true } }
      }
    });

    if (requestRecord) {
      try {
        await sendJoinRequestSubmittedEmail({
          parishId: requestRecord.parishId,
          parishName: requestRecord.parish.name,
          requesterId: requestRecord.userId,
          requesterEmail: requestRecord.user.email,
          requesterName: requestRecord.user.name
        });
      } catch (error) {
        console.error("Failed to send join request confirmation email", error);
      }

      const adminMemberships = await prisma.membership.findMany({
        where: {
          parishId: requestRecord.parishId,
          role: { in: ["ADMIN", "SHEPHERD"] }
        },
        select: {
          userId: true,
          role: true,
          notifyEmailEnabled: true,
          user: { select: { email: true, name: true } }
        }
      });

      const admins = selectJoinRequestAdminRecipients(
        adminMemberships.map((membership) => ({
          userId: membership.userId,
          role: membership.role,
          notifyEmailEnabled: membership.notifyEmailEnabled,
          email: membership.user.email,
          name: membership.user.name
        }))
      );

      await Promise.all(
        admins.map(async (admin) => {
          try {
            await sendJoinRequestAdminNotificationEmail({
              parishId: requestRecord.parishId,
              parishName: requestRecord.parish.name,
              requesterId: requestRecord.userId,
              requesterEmail: requestRecord.user.email,
              requesterName: requestRecord.user.name,
              admin,
              joinRequestId: requestRecord.id
            });
          } catch (error) {
            console.error("Failed to send join request admin notification", error);
          }
        })
      );

      try {
        await notifyParishJoinRequestInApp({
          parishId: requestRecord.parishId,
          requesterId: requestRecord.userId,
          requesterName: requestRecord.user.name,
          adminUserIds: adminMemberships.map((membership) => membership.userId),
          parishName: requestRecord.parish.name
        });
      } catch (error) {
        console.error("Failed to create join request in-app notifications", error);
      }

      try {
        await notifyParishJoinRequest({
          parishId: requestRecord.parishId,
          requesterId: requestRecord.userId,
          requesterName: requestRecord.user.name,
          adminUserIds: adminMemberships.map((membership) => membership.userId)
        });
      } catch (error) {
        console.error("Failed to send join request push notifications", error);
      }
    }
  }

  return NextResponse.json({ status: result.status, parishId: result.parishId }, { status: 200 });
}
