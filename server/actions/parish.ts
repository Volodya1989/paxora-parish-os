"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { createDefaultParishHubItems } from "@/server/db/parish-hub";

export async function createParish() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (session.user.activeParishId) {
    redirect("/this-week");
  }

  const parish = await prisma.parish.create({
    data: {
      name: "Default Parish",
      slug: `parish-${session.user.id.slice(0, 8)}`
    }
  });

  await createDefaultParishHubItems(parish.id);

  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: session.user.id,
      role: "SHEPHERD"
    }
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeParishId: parish.id }
  });

  redirect("/this-week");
}
