"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { assertActiveSession, requireAdminOrShepherd } from "@/server/auth/permissions";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { assertDigestTransition, buildDigestContent } from "@/domain/digest";
import {
  getWeekDigest,
  getWeekDigestSummary,
  publishDigestRecord,
  upsertDigestDraft
} from "@/server/db/digest";

function mapDigestStatus(status: "DRAFT" | "PUBLISHED") {
  return status === "PUBLISHED" ? "published" : "draft";
}

export async function generateDigestPreview() {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertActiveSession(session);
  await requireAdminOrShepherd(userId, parishId);

  const week = await getOrCreateCurrentWeek(parishId);
  const summary = await getWeekDigestSummary(parishId, week.id);

  if (!summary) {
    throw new Error("Not found");
  }

  const content = buildDigestContent({
    tasks: summary.tasks.map((task) => ({
      title: task.title,
      status: task.status === "DONE" ? "DONE" : "OPEN"
    })),
    events: summary.events
  });

  return { content };
}

export async function saveDigestDraft(
  content: string
): Promise<{ content: string; status: "draft" | "published" }> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertActiveSession(session);
  await requireAdminOrShepherd(userId, parishId);

  const week = await getOrCreateCurrentWeek(parishId);
  const existing = await getWeekDigest(parishId, week.id);

  if (existing) {
    assertDigestTransition(existing.status, "DRAFT");
  }

  const digest = await upsertDigestDraft({
    parishId,
    weekId: week.id,
    userId,
    content
  });

  revalidatePath("/digest");
  revalidatePath("/this-week");

  return {
    content: digest.content,
    status: mapDigestStatus(digest.status)
  };
}

export async function publishDigest(
  content: string
): Promise<{ content: string; status: "draft" | "published" }> {
  const session = await getServerSession(authOptions);
  const { userId, parishId } = assertActiveSession(session);
  await requireAdminOrShepherd(userId, parishId);

  const week = await getOrCreateCurrentWeek(parishId);
  const existing = await getWeekDigest(parishId, week.id);

  if (existing) {
    assertDigestTransition(existing.status, "PUBLISHED");
  }

  const digest = await publishDigestRecord({
    parishId,
    weekId: week.id,
    userId,
    content
  });

  revalidatePath("/digest");
  revalidatePath("/this-week");

  return {
    content: digest.content,
    status: mapDigestStatus(digest.status)
  };
}
