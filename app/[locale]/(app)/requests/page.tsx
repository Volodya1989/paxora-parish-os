import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth/options";
import { listMyRequests } from "@/lib/queries/requests";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import MyRequestsList from "@/components/requests/MyRequestsList";
import { cn } from "@/lib/ui/cn";

export default async function MyRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  const [requests, parish] = await Promise.all([
    listMyRequests(session.user.activeParishId, session.user.id),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true, logoUrl: true }
    })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle="My Requests"
      parishName={parish?.name ?? "My Parish"}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle="Track updates and follow-ups"
      backHref="/parish"
      actions={
        <Link
          href="/requests/new"
          className={cn(
            "inline-flex min-h-[2.25rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-button border border-white/40 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-white/20 focus-ring sm:gap-2 sm:px-3 sm:text-xs"
          )}
        >
          Make a Request
        </Link>
      }
    >
      <MyRequestsList requests={requests} />
    </ParishionerPageLayout>
  );
}
