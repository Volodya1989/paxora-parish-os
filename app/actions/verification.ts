"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { issueEmailVerification } from "@/lib/auth/emailVerification";

export async function requestEmailVerification() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await issueEmailVerification(session.user.id);
  redirect("/access?verify=sent");
}
