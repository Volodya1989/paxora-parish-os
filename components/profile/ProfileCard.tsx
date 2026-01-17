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
          <CardTitle>Profile summary</CardTitle>
          <CardDescription>Manage your account details and parish role.</CardDescription>
        </CardHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-ink-500">Name</p>
            <p className="text-sm font-medium text-ink-900">{name ?? "Unnamed member"}</p>
          </div>
          <div>
            <p className="text-sm text-ink-500">Email</p>
            <p className="text-sm font-medium text-ink-900">{email}</p>
          </div>
          {displayRole ? (
            <div>
              <p className="text-sm text-ink-500">Parish role</p>
              <p className="text-sm font-medium text-ink-900">{displayRole}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4">
          <div>
            <p className="text-sm font-medium text-ink-900">Sign out</p>
            <p className="text-sm text-ink-500">End your current session on this device.</p>
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
