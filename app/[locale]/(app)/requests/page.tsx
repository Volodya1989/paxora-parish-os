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
      select: { name: true }
    })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle="My Requests"
      parishName={parish?.name ?? "My Parish"}
      subtitle="Track updates and follow-ups"
      backHref="/parish"
      actions={
        <Link
          href="/requests/new"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-button border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20 focus-ring"
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
