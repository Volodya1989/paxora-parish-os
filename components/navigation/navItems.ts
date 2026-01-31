import { routes } from "@/lib/navigation/routes";

export type NavItem = {
  labelKey: string;
  href: string;
  icon: string;
  primary?: boolean;
  testId: string;
};

export const primaryNavItems: NavItem[] = [
  { labelKey: "nav.thisWeek", href: routes.thisWeek, icon: "TW", primary: true, testId: "this-week" },
  { labelKey: "nav.serve", href: routes.serve, icon: "SV", testId: "serve" },
  { labelKey: "nav.groups", href: routes.groups, icon: "GR", testId: "groups" },
  { labelKey: "nav.calendar", href: routes.calendar, icon: "CA", testId: "calendar" },
  { labelKey: "nav.parish", href: routes.parish, icon: "PH", testId: "parish-hub" }
];

export type NavRole = "ADMIN" | "SHEPHERD" | "MEMBER" | null | undefined;

export function getPrimaryNavItems(_role?: NavRole) {
  // People is always in the More drawer, not in the primary nav
  return primaryNavItems;
}

const baseMoreNavItems: NavItem[] = [
  { labelKey: "nav.announcements", href: routes.announcements, icon: "AN", testId: "announcements" },
  { labelKey: "nav.profile", href: "/profile", icon: "PR", testId: "profile" }
];

export function getMoreNavItems(role?: NavRole) {
  if (role === "ADMIN" || role === "SHEPHERD") {
    return [
      baseMoreNavItems[0],
      { labelKey: "nav.people", href: routes.adminPeople, icon: "PE", testId: "people" },
      baseMoreNavItems[1]
    ];
  }
  return baseMoreNavItems;
}
