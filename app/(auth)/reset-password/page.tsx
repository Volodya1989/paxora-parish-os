import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams?: { token?: string };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = searchParams?.token?.trim();

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist-50/60 px-4 py-12">
      <Card className="w-full max-w-md">
        <SectionTitle title="Reset password" subtitle="Choose a new password for your account." />
        <p className="mt-3 text-sm text-ink-500">
          Enter a new password below. You’ll be redirected to sign in once it’s updated.
        </p>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="mt-6 text-sm text-red-600">This reset link is invalid or expired.</p>
        )}
      </Card>
    </main>
  );
}
