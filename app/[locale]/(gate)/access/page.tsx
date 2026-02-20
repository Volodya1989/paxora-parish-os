import { redirect } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/ui/SectionTitle";
import { SignOutButton } from "@/components/navigation/SignOutButton";
import AccessGateContent from "@/components/access/AccessGateContent";
import { joinParishByCodeAction } from "@/app/actions/access";
import { requestEmailVerification } from "@/app/actions/verification";
import { getAccessGateState } from "@/lib/queries/access";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";

type AccessPageProps = {
  searchParams?: { verify?: string; join?: string };
  params: { locale: string };
};

export default async function AccessPage({ searchParams, params }: AccessPageProps) {
  const locale = getLocaleFromParam(params.locale);
  const access = await getAccessGateState();
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const verifySent = resolvedSearchParams?.verify === "sent";
  const joinError = resolvedSearchParams?.join === "invalid";
  const alreadyMember = resolvedSearchParams?.join === "already";

  if (access.status === "approved") {
    // Approved members land on Home (/).
    redirect(buildLocalePathname(locale, "/"));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist-50/70 px-4 py-12">
      <Card className="w-full max-w-xl space-y-6">
        <div className="space-y-3">
          <SectionTitle
            title="Parish access"
            subtitle="A calm onboarding step before you enter the workspace."
          />
          <AccessGateContent status={access.status} parishName={access.parishName} />
        </div>

        {access.status === "unverified" ? (
          <form className="space-y-3" action={requestEmailVerification}>
            {verifySent ? (
              <p className="text-sm text-emerald-600">
                Check your email for a verification link.
              </p>
            ) : null}
            <Button className="w-full" type="submit">
              Resend verification email
            </Button>
          </form>
        ) : access.status === "none" ? (
          <form className="space-y-3" action={joinParishByCodeAction}>
            <label htmlFor="parish-code" className="text-sm font-medium text-ink-700">
              Parish code
            </label>
            <input
              id="parish-code"
              name="code"
              required
              className="w-full rounded-input border border-mist-300 px-3 py-2 text-sm uppercase tracking-wide text-ink-900"
              placeholder="Enter parish code"
              autoCapitalize="characters"
              autoCorrect="off"
            />
            <Button className="w-full" type="submit">
              Join Parish
            </Button>
            {joinError ? <p className="text-xs text-red-600">Invalid parish code. Try again.</p> : null}
            {alreadyMember ? (
              <p className="text-xs text-emerald-600">You are already a member of this parish.</p>
            ) : null}
          </form>
        ) : (
          <div className="space-y-3 rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink-700">We&apos;ll notify you by email.</p>
              <p className="text-xs text-ink-400">
                You can safely close this tab and return once a leader approves access.
              </p>
            </div>
            <Link
              href={buildLocalePathname(locale, "/access")}
              className="inline-flex w-full items-center justify-center rounded-full border border-transparent px-4 py-2 text-sm font-medium text-ink-600 transition hover:bg-mist-100"
            >
              Refresh status
            </Link>
          </div>
        )}

        <div className="rounded-card border border-mist-200 bg-white p-3">
          <SignOutButton compact />
        </div>
      </Card>
    </main>
  );
}
