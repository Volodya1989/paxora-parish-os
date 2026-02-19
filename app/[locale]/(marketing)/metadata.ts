import type { Metadata } from "next";

export function buildMarketingMetadata(title: string, description: string, path: string): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = new URL(path, siteUrl).toString();
  const imageUrl = new URL("/og/marketing-default.svg", siteUrl).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Paxora Parish OS",
      images: [{ url: imageUrl }],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}
