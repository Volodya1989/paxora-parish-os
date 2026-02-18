import { redirect } from "next/navigation";
import { getLocaleFromParam } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Home route (`/[locale]`).
 *
 * The canonical landing page is `/[locale]/this-week`. Users reaching Home
 * via bookmark, tab restore, or direct navigation are redirected there to
 * prevent confusion with the old legacy This Week hero card that used to
 * live here.
 */
export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  redirect(`/${locale}/this-week`);
}
