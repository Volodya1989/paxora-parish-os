import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import { authOptions } from "@/server/auth/options";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";
import InviteAcceptClient from "./InviteAcceptClient";

type SearchParams = Record<string, string | string[] | undefined>;

type InvitePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function ParishInvitePage({ params, searchParams }: InvitePageProps) {
  const { locale: localeParam } = await params;
  const locale = getLocaleFromParam(localeParam);
  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const tokenParam = Array.isArray(sp?.token) ? sp?.token[0] : sp?.token;
  const token = tokenParam?.toString() ?? "";

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist-50/60 px-4 py-12">
        <Card className="w-full max-w-md">
          <SectionTitle title="Invite link missing" subtitle="Check your invite email and try again." />
          <p className="mt-3 text-sm text-ink-500">
            We couldn’t find an invite token in the link you opened.
          </p>
        </Card>
      </main>
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const returnTo = buildLocalePathname(
      locale,
      `/invite/parish?token=${encodeURIComponent(token)}`
    );
    redirect(buildLocalePathname(locale, `/sign-up?returnTo=${encodeURIComponent(returnTo)}`));
  }

  return <InviteAcceptClient token={token} locale={locale} />;
}
