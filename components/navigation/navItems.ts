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
  { labelKey: "nav.calendar", href: routes.calendar, icon: "CA", testId: "calendar" }
];

export type NavRole = "ADMIN" | "SHEPHERD" | "MEMBER" | null | undefined;

export function getPrimaryNavItems(role?: NavRole) {
  if (role === "ADMIN" || role === "SHEPHERD") {
    return [
      ...primaryNavItems,
      { labelKey: "nav.people", href: routes.adminPeople, icon: "PE", testId: "people" }
    ];
  }
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
