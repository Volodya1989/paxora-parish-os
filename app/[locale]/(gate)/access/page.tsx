import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/ui/SectionTitle";
import { SignOutButton } from "@/components/navigation/SignOutButton";
import AccessGateContent from "@/components/access/AccessGateContent";
import { requestParishAccess } from "@/app/actions/access";
import { requestEmailVerification } from "@/app/actions/verification";
import { getAccessGateState } from "@/lib/queries/access";
import { buildLocalePathname } from "@/lib/i18n/routing";

type AccessPageProps = {
  searchParams?: { verify?: string };
  params: { locale: string };
};

export default async function AccessPage({ searchParams, params }: AccessPageProps) {
  const locale = params.locale;
  const access = await getAccessGateState();
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const verifySent = resolvedSearchParams?.verify === "sent";

  if (access.status === "approved") {
    // Approved members land on Home (/).
    redirect(buildLocalePathname(locale, "/"));
  }

  const hasParish = Boolean(access.parishId);

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
          <form className="space-y-3" action={requestParishAccess}>
            <input type="hidden" name="parishId" value={access.parishId ?? ""} />
            <Button className="w-full" type="submit" disabled={!hasParish}>
              Request access
            </Button>
            {!hasParish ? (
              <p className="text-xs text-ink-400">
                There isn&apos;t a parish available yet. Please check back soon.
              </p>
            ) : null}
          </form>
        ) : (
          <div className="rounded-card border border-mist-200 bg-mist-50 px-4 py-3">
            <p className="text-sm font-medium text-ink-700">We&apos;ll notify you by email.</p>
            <p className="text-xs text-ink-400">
              You can safely close this tab and return once a leader approves access.
            </p>
          </div>
        )}

        <div className="rounded-card border border-mist-200 bg-white p-3">
          <SignOutButton compact />
        </div>
      </Card>
    </main>
  );
}
