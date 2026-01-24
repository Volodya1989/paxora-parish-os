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
          You&apos;re approved {parishLabel}. Head back to the dashboard to begin.
        </p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">Access pending</h2>
        <p className="text-sm text-ink-500">
          Your request is with a parish leader. They can review it from their tasks view.
        </p>
      </div>
    );
  }

  if (status === "unverified") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">Verify your email</h2>
        <p className="text-sm text-ink-500">
          Confirm your email address before requesting access {parishLabel}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-h2">Request access</h2>
      <p className="text-sm text-ink-500">
        Ask to join the parish workspace {parishLabel}. A leader will review and approve your
        access.
      </p>
    </div>
  );
}
