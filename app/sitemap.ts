import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";

const marketingRoutes = ["", "/features", "/pricing", "/about", "/demo", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const now = new Date();

  return locales.flatMap((locale) =>
    marketingRoutes.map((route) => ({
      url: `${siteUrl}/${locale}${route}`,
      lastModified: now,
      changeFrequency: route === "" ? "weekly" : "monthly",
      priority: route === "" ? 1 : 0.7
    }))
  );
}
