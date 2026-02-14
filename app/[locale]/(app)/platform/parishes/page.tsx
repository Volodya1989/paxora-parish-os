import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requirePlatformAdmin } from "@/server/auth/permissions";
import { listPlatformParishes } from "@/lib/queries/platformParishes";
import PlatformParishesView from "@/components/platform/PlatformParishesView";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { LayoutGridIcon } from "@/components/icons/ParishIcons";

export default async function PlatformParishesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  await requirePlatformAdmin(session.user.id);

  const parishes = await listPlatformParishes();

  return (
    <ParishionerPageLayout
      pageTitle="Platform Parishes"
      parishName="Paxora Platform"
      parishLogoUrl={null}
      subtitle="Manage parish profiles, defaults, and impersonation contexts."
      gradientClass="from-primary-600 via-primary-500 to-emerald-500"
      icon={<LayoutGridIcon className="h-6 w-6 text-white" />}
    >
      <PlatformParishesView
        parishes={parishes}
        impersonatedParishId={session.user.impersonatedParishId ?? null}
      />
    </ParishionerPageLayout>
  );
}
