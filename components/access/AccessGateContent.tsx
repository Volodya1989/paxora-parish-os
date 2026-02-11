import type { AccessGateStatus } from "@/lib/queries/access";

type AccessGateContentProps = {
  status: AccessGateStatus;
  parishName?: string | null;
};

export default function AccessGateContent({ status, parishName }: AccessGateContentProps) {
  const parishLabel = parishName ? `at ${parishName}` : "for this parish";

  if (status === "approved") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">Access granted</h2>
        <p className="text-sm text-ink-500">
          You&apos;re approved {parishLabel}. Continue to the workspace to start this week.
        </p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">Access pending</h2>
        <p className="text-sm text-ink-500">
          Your request is in review. A parish leader will approve or decline it and we&apos;ll email
          you as soon as status changes.
        </p>
      </div>
    );
  }

  if (status === "unverified") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">Verify your email</h2>
        <p className="text-sm text-ink-500">
          Confirm your email address before requesting access {parishLabel}. You can resend the
          verification email below.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-h2">Request access</h2>
      <p className="text-sm text-ink-500">
        Ask to join the parish workspace {parishLabel}. Parish leadership reviews every request.
      </p>
    </div>
  );
}
