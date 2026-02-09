import { prisma } from "@/server/db/prisma";

export type PlatformParishRecord = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  timezone: string;
  logoUrl: string | null;
  defaultLocale: string;
  createdAt: Date;
};

export async function listPlatformParishes(): Promise<PlatformParishRecord[]> {
  return prisma.parish.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      timezone: true,
      logoUrl: true,
      defaultLocale: true,
      createdAt: true
    }
  });
}
