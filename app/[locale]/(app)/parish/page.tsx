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
      <div className="relative -mx-4 -mt-6 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-teal-500 px-6 pb-10 pt-8 text-white md:-mx-8 md:rounded-b-3xl md:px-8">
        {/* Decorative elements */}
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute right-1/4 top-1/2 h-16 w-16 rounded-full bg-white/5" />
        
        <div className="relative">
          <p className="text-sm font-medium text-primary-100">Welcome to</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {parish?.name ?? "Parish Hub"}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-primary-100">
            Your central place for parish resources, announcements, and community connections.
          </p>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-400">
          Quick Access
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {quickAccessItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-mist-100 bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-mist-200 hover:shadow-md active:scale-[0.98]"
            >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition-transform duration-200 group-hover:scale-110",
                  item.color
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-ink-800 group-hover:text-ink-900">
                  {item.label}
                </span>
                <p className="mt-0.5 hidden text-xs text-ink-400 sm:block">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Parish Hub Grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Resources
          </h2>
          {isAdmin && (
            <Link
              href="/profile"
              className="rounded-button bg-mist-100 px-3 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-mist-200"
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
