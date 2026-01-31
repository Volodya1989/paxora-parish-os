import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { listParishHubItemsForMember, ensureParishHubDefaults } from "@/server/actions/parish-hub";
import { prisma } from "@/server/db/prisma";
import ParishHubGrid from "@/components/parish-hub/ParishHubGrid";
import ParishHubEmptyState from "@/components/parish-hub/ParishHubEmptyState";
import type { ParishHubItemData } from "@/components/parish-hub/ParishHubTile";
import { cn } from "@/lib/ui/cn";
import { CalendarIcon, UsersIcon, HandHeartIcon, MegaphoneIcon } from "@/components/icons/ParishIcons";

// Quick access items for parishioners
const quickAccessItems = [
  {
    label: "Calendar",
    href: "/calendar",
    icon: CalendarIcon,
    color: "bg-teal-500",
    description: "View events"
  },
  {
    label: "Groups",
    href: "/groups",
    icon: UsersIcon,
    color: "bg-sky-500",
    description: "Find community"
  },
  {
    label: "Serve",
    href: "/tasks",
    icon: HandHeartIcon,
    color: "bg-emerald-500",
    description: "Volunteer"
  },
  {
    label: "News",
    href: "/announcements",
    icon: MegaphoneIcon,
    color: "bg-amber-500",
    description: "Stay updated"
  }
];

export default async function ParishHubPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return null;
  }

  // Ensure default hub items exist for new parishes
  await ensureParishHubDefaults();

  const [items, membership, parish] = await Promise.all([
    listParishHubItemsForMember(),
    getParishMembership(session.user.activeParishId, session.user.id),
    prisma.parish.findUnique({
      where: { id: session.user.activeParishId },
      select: { name: true }
    })
  ]);

  const isAdmin = membership ? isParishLeader(membership.role) : false;

  // Transform items to match ParishHubItemData type
  const hubItems: ParishHubItemData[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon as ParishHubItemData["icon"],
    targetType: item.targetType as "EXTERNAL" | "INTERNAL",
    targetUrl: item.targetUrl,
    internalRoute: item.internalRoute
  }));

  return (
    <div className="space-y-8">
      {/* Header section with gradient background */}
      <div className="relative -mx-4 -mt-4 overflow-hidden rounded-b-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 pb-8 pt-6 text-white md:-mx-8 md:px-8">
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
        
        <div className="relative">
          <p className="text-sm font-medium text-emerald-100">Welcome to</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {parish?.name ?? "Parish Hub"}
          </h1>
          <p className="mt-2 text-sm text-emerald-100">
            Quick links to parish resources and information
          </p>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-500">
          Quick Access
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {quickAccessItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform group-hover:scale-110",
                  item.color
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-ink-700 group-hover:text-ink-900">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Parish Hub Grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
            Resources
          </h2>
          {isAdmin && (
            <Link
              href="/profile"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Manage Hub
            </Link>
          )}
        </div>

        {hubItems.length > 0 ? (
          <ParishHubGrid items={hubItems} />
        ) : (
          <ParishHubEmptyState isAdmin={isAdmin} />
        )}
      </section>
    </div>
  );
}
