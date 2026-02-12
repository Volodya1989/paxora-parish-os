import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { listFailedDeliveryAttempts } from "@/lib/queries/reliability";
import ParishionerPageLayout from "@/components/parishioner/ParishionerPageLayout";
import { prisma } from "@/server/db/prisma";
import type { DeliveryChannel } from "@prisma/client";

const allowedHours = [24, 72, 168] as const;
const allowedChannels: Array<DeliveryChannel | "ALL"> = ["ALL", "EMAIL", "PUSH"];

export default async function AdminReliabilityPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  await requireAdminOrShepherd(session.user.id, session.user.activeParishId);

  const params = await searchParams;
  const parsedHours = Number(typeof params.range === "string" ? params.range : "72");
  const sinceHours = allowedHours.includes(parsedHours as (typeof allowedHours)[number])
    ? parsedHours
    : 72;
  const channelParam = typeof params.channel === "string" ? params.channel.toUpperCase() : "ALL";
  const channel = allowedChannels.includes(channelParam as DeliveryChannel | "ALL")
    ? (channelParam as DeliveryChannel | "ALL")
    : "ALL";

  const [failures, parish] = await Promise.all([
    listFailedDeliveryAttempts({ parishId: session.user.activeParishId, sinceHours, channel }),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true, logoUrl: true }
    })
  ]);

  return (
    <ParishionerPageLayout
      pageTitle="Reliability"
      parishName={parish?.name ?? "My Parish"}
      parishLogoUrl={parish?.logoUrl ?? null}
      subtitle="Recent failed email and push deliveries"
    >
      <div className="space-y-4">
        <form className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            Range
            <select name="range" defaultValue={String(sinceHours)} className="rounded border px-2 py-1">
              <option value="24">Last 24h</option>
              <option value="72">Last 72h</option>
              <option value="168">Last 7d</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Channel
            <select name="channel" defaultValue={channel} className="rounded border px-2 py-1">
              <option value="ALL">All</option>
              <option value="EMAIL">Email</option>
              <option value="PUSH">Push</option>
            </select>
          </label>
          <button type="submit" className="rounded border px-3 py-1">
            Apply
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Recipient</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Context</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((attempt) => (
                <tr key={attempt.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{attempt.createdAt.toISOString()}</td>
                  <td className="px-3 py-2">{attempt.channel}</td>
                  <td className="px-3 py-2">
                    {attempt.user?.name ?? attempt.user?.email ?? attempt.target ?? "Unknown"}
                  </td>
                  <td className="px-3 py-2">{attempt.template ?? "-"}</td>
                  <td className="px-3 py-2">{attempt.errorMessage ?? attempt.errorCode ?? "Unknown"}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {attempt.context ? JSON.stringify(attempt.context) : "-"}
                  </td>
                </tr>
              ))}
              {failures.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                    No failed sends in this window.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </ParishionerPageLayout>
  );
}
