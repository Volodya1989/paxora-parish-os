import Link from "next/link";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import { verifyEmailToken } from "@/lib/auth/emailVerification";
import { buildLocalePathname } from "@/lib/i18n/routing";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
  params: { locale: string };
};

export default async function VerifyEmailPage({ searchParams, params }: VerifyEmailPageProps) {
  const locale = params.locale;
  const sp = await searchParams;             
  const token = sp?.token?.trim();            

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist-50/60 px-4 py-12">
        <Card className="w-full max-w-md space-y-3">
          <SectionTitle title="Verify email" subtitle="We couldn't verify this link." />
          <p className="text-sm text-red-600">This verification link is invalid or expired.</p>
          <Link className="text-sm text-ink-700 underline" href={buildLocalePathname(locale, "/sign-in")}>
            Return to sign in
          </Link>
        </Card>
      </main>
    );
  }

  const result = await verifyEmailToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist-50/60 px-4 py-12">
      <Card className="w-full max-w-md space-y-3">
        <SectionTitle title="Verify email" subtitle="Confirming your address." />
        {result.success ? (
          <>
            <p className="text-sm text-emerald-600">
              Email verified. You can now sign in and request access.
            </p>
            <Link
              className="text-sm text-ink-700 underline"
              href={buildLocalePathname(locale, "/sign-in?verify=success")}
            >
              Continue to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-red-600">This verification link is invalid or expired.</p>
            <Link className="text-sm text-ink-700 underline" href={buildLocalePathname(locale, "/sign-in")}>
              Return to sign in
            </Link>
          </>
        )}
      </Card>
    </main>
  );
}
