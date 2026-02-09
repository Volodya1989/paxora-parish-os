import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requirePlatformAdmin } from "@/server/auth/permissions";
import { listPlatformParishes } from "@/lib/queries/platformParishes";
import PlatformParishesView from "@/components/platform/PlatformParishesView";

export default async function PlatformParishesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  await requirePlatformAdmin(session.user.id);

  const parishes = await listPlatformParishes();

  return (
    <PlatformParishesView
      parishes={parishes}
      impersonatedParishId={session.user.impersonatedParishId ?? null}
    />
  );
}
