import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }


  const requesterMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: session.user.activeParishId,
        userId: session.user.id
      }
    },
    select: { role: true }
  });

  if (!requesterMembership || requesterMembership.role !== "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const recipients = await prisma.membership.findMany({
    where: {
      parishId: session.user.activeParishId,
      role: { in: ["ADMIN", "SHEPHERD"] }
    },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return NextResponse.json({
    recipients: recipients
      .filter((entry) => Boolean(entry.user.email))
      .map((entry) => ({
        id: entry.userId,
        name: entry.user.name ?? entry.user.email ?? "Parish staff",
        email: entry.user.email,
        role: entry.role
      }))
  });
}
