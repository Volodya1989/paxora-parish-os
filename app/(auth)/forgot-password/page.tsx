import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist-50/60 px-4 py-12">
      <Card className="w-full max-w-md">
        <SectionTitle title="Forgot password" subtitle="We’ll email you a reset link." />
        <p className="mt-3 text-sm text-ink-500">
          Enter the email address you use to sign in. If we find an account, we’ll send reset
          instructions.
        </p>
        <ForgotPasswordForm />
      </Card>
    </main>
  );
}
