import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import RequestCreateFlow from "@/components/requests/RequestCreateFlow";

export default async function NewRequestPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  const parish = await prisma.parish.findUnique({
    where: { id: session.user.activeParishId },
    select: { name: true }
  });

  return (
    <ParishionerPageLayout
      pageTitle="Make a Request"
      parishName={parish?.name ?? "My Parish"}
      subtitle="Share a need or ask for support"
      backHref="/parish"
    >
      <RequestCreateFlow />
    </ParishionerPageLayout>
  );
}
