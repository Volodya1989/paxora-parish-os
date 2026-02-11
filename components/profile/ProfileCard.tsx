import React from "react";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { SignOutButton } from "@/components/navigation/SignOutButton";

type ProfileCardProps = {
  name: string | null;
  email: string;
  role?: string | null;
};

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  SHEPHERD: "Clergy",
  MEMBER: "Parishioner"
};

const formatRole = (role?: string | null) => {
  if (!role) return null;
  return roleLabels[role] ?? role;
};

export function ProfileCard({ name, email, role }: ProfileCardProps) {
  const displayRole = formatRole(role);

  return (
    <Card>
      <div className="space-y-6">
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
          <CardDescription>
            Review your identity and sign-in details for this parish.
          </CardDescription>
        </CardHeader>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-500">Name</dt>
            <dd className="text-sm font-medium text-ink-900">{name ?? "Unnamed member"}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-500">Email</dt>
            <dd className="break-all text-sm font-medium text-ink-900">{email}</dd>
          </div>
          {displayRole ? (
            <div>
              <dt className="text-sm text-ink-500">Parish role</dt>
              <dd className="text-sm font-medium text-ink-900">{displayRole}</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-col gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900">Sign out of this device</p>
            <p className="text-sm text-ink-500">You can sign in again anytime.</p>
          </div>
          <div className="w-full sm:w-40">
            <SignOutButton />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ProfileCard;
