import Link from "next/link";
import { UsersIcon } from "@/components/icons/ParishIcons";
import AccentSectionCard from "@/components/layout/AccentSectionCard";
import { routes } from "@/lib/navigation/routes";

type GroupPreview = {
  id: string;
  name: string;
  description: string | null;
};

type SectionCommunityProps = {
  groups: GroupPreview[];
  hasPublicGroups: boolean;
};

/**
 * Section displaying community groups that the user is NOT yet a member of.
 *
 * Shows up to 3 groups available to join, encouraging community participation.
 * Uses a sky/info accent color for community and discovery-focused content.
 * Only shows "Discover groups" link if public groups exist in the parish.
 *
 * **Empty State:** Shows when user has joined all public groups or no groups exist.
 * Encourages browsing the full community groups page.
 *
 * **Color System:** Sky accent (info/discovery tone)
 *
 * @param props - Component props
 * @param props.groups - Array of group previews user can join (up to 3 shown)
 * @param props.hasPublicGroups - Whether any public groups exist in the parish
 * @returns Rendered community section with scroll anchor
 *
 * @example
 * <SectionCommunity groups={availableGroups} hasPublicGroups={true} />
 */
export default function SectionCommunity({ groups, hasPublicGroups }: SectionCommunityProps) {
  return (
    <section id="community" className="scroll-mt-24">
      <AccentSectionCard
        title="Community"
        icon={<UsersIcon className="h-5 w-5" />}
        borderClass="border-sky-200"
        iconClass="bg-sky-100 text-sky-700"
        action={
          hasPublicGroups ? (
            <Link
              className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
              href={routes.groups}
            >
              Discover groups
            </Link>
          ) : null
        }
      >
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="rounded-card border border-sky-100 bg-sky-50/40 px-4 py-3 text-sm text-ink-500">
              You have not joined a group yet. {" "}
              <Link className="font-medium text-ink-700 underline" href={routes.groups}>
                Browse community groups
              </Link>
              .
            </div>
          ) : (
            groups.slice(0, 3).map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-3 rounded-card border border-mist-100 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{group.name}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {group.description ?? "Connect with others in this community."}
                  </p>
                </div>
                <Link
                  className="text-sm font-medium text-sky-700 underline"
                  href={`/groups/${group.id}`}
                >
                  Open
                </Link>
              </div>
            ))
          )}
        </div>
      </AccentSectionCard>
    </section>
  );
}
