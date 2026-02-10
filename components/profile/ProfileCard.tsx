import React from "react";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { SignOutButton } from "@/components/navigation/SignOutButton";
import { useTranslations } from "@/lib/i18n/provider";

type ProfileCardProps = {
  name: string | null;
  email: string;
  role?: string | null;
};

const formatRole = (role: string | null | undefined, t: (key: string) => string) => {
  if (!role) return null;
  if (role === "ADMIN") return t("profile.roles.admin");
  if (role === "SHEPHERD") return t("profile.roles.clergy");
  if (role === "MEMBER") return t("profile.roles.parishioner");
  return role;
};

export function ProfileCard({ name, email, role }: ProfileCardProps) {
  const t = useTranslations();
  const displayRole = formatRole(role, t);

  return (
    <Card>
      <div className="space-y-6">
        <CardHeader>
          <CardTitle>{t("profile.accountOverview")}</CardTitle>
          <CardDescription>
            {t("profile.accountOverviewDescription")}
          </CardDescription>
        </CardHeader>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-500">{t("profile.name")}</dt>
            <dd className="text-sm font-medium text-ink-900">{name ?? t("profile.unnamedMember")}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-500">{t("profile.email")}</dt>
            <dd className="break-all text-sm font-medium text-ink-900">{email}</dd>
          </div>
          {displayRole ? (
            <div>
              <dt className="text-sm text-ink-500">{t("profile.parishRole")}</dt>
              <dd className="text-sm font-medium text-ink-900">{displayRole}</dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4">
          <div>
            <p className="text-sm font-medium text-ink-900">{t("profile.signOutDevice")}</p>
            <p className="text-sm text-ink-500">{t("profile.signOutDeviceDescription")}</p>
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
