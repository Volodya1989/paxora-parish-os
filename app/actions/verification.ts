"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { issueEmailVerification } from "@/lib/auth/emailVerification";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { getLocaleFromCookies } from "@/lib/i18n/server";

export async function requestEmailVerification() {
  const session = await getServerSession(authOptions);
  const locale = await getLocaleFromCookies();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await issueEmailVerification(session.user.id);
  redirect(buildLocalePathname(locale, "/access?verify=sent"));
}
