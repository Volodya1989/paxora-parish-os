"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { requireSuperAdmin } from "@/server/auth/super-admin";
import { prisma } from "@/server/db/prisma";
import { createDefaultParishHubItems } from "@/server/db/parish-hub";
import { parishSchema } from "@/lib/validation/parish";
import { slugifyParishName } from "@/lib/parish/slug";

function normalizeOptional(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function createParishAsSuperAdmin(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireSuperAdmin(session.user.id);

  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = rawSlug.length ? rawSlug : slugifyParishName(name);

  const parsed = parishSchema.safeParse({
    name,
    slug,
    timezone: normalizeOptional(formData.get("timezone")),
    contactEmail: normalizeOptional(formData.get("contactEmail")),
    contactPhone: normalizeOptional(formData.get("contactPhone"))
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid parish data");
  }

  const parish = await prisma.parish.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      timezone: parsed.data.timezone ?? null,
      contactEmail: parsed.data.contactEmail ?? null,
      contactPhone: parsed.data.contactPhone ?? null
    }
  });

  await createDefaultParishHubItems(parish.id);

  revalidatePath("/super-admin");

  return parish.id;
}

export async function updateParishAsSuperAdmin(parishId: string, formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await requireSuperAdmin(session.user.id);

  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = rawSlug.length ? rawSlug : slugifyParishName(name);

  const parsed = parishSchema.safeParse({
    name,
    slug,
    timezone: normalizeOptional(formData.get("timezone")),
    contactEmail: normalizeOptional(formData.get("contactEmail")),
    contactPhone: normalizeOptional(formData.get("contactPhone"))
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message ?? "Invalid parish data");
  }

  await prisma.parish.update({
    where: { id: parishId },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      timezone: parsed.data.timezone ?? null,
      contactEmail: parsed.data.contactEmail ?? null,
      contactPhone: parsed.data.contactPhone ?? null
    }
  });

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/parishes/${parishId}`);
}
