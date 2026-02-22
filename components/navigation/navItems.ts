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
  { labelKey: "nav.community", href: routes.groups, icon: "GR", testId: "groups" },
  { labelKey: "nav.events", href: routes.calendar, icon: "CA", testId: "calendar" },
  { labelKey: "nav.parish", href: routes.parish, icon: "PH", testId: "parish-hub" }
];

export type NavRole = "ADMIN" | "SHEPHERD" | "MEMBER" | null | undefined;
export type PlatformNavRole = "SUPERADMIN" | null | undefined;

export function getPrimaryNavItems(_role?: NavRole) {
  // People is always in the More drawer, not in the primary nav
  return primaryNavItems;
}

const baseMoreNavItems: NavItem[] = [
  { labelKey: "nav.announcements", href: routes.announcements, icon: "AN", testId: "announcements" },
  { labelKey: "nav.profile", href: "/profile", icon: "PR", testId: "profile" }
];

export function getMoreNavItems(role?: NavRole, platformRole?: PlatformNavRole) {
  const requestItem: NavItem = {
    labelKey: "nav.requests",
    href: role === "ADMIN" || role === "SHEPHERD" ? routes.adminRequests : routes.requests,
    icon: "RQ",
    testId: "requests"
  };
  const platformItem: NavItem | null =
    platformRole === "SUPERADMIN"
      ? {
          labelKey: "nav.platformParishes",
          href: routes.platformParishes,
          icon: "PF",
          testId: "platform-parishes"
        }
      : null;

  if (role === "ADMIN" || role === "SHEPHERD") {
    return [
      baseMoreNavItems[0],
      requestItem,
      { labelKey: "nav.reliability", href: routes.adminReliability, icon: "RL", testId: "reliability" },
      { labelKey: "nav.reports", href: routes.adminReports, icon: "RP", testId: "reports" },
      ...(platformItem ? [platformItem] : []),
      { labelKey: "nav.people", href: routes.adminPeople, icon: "PE", testId: "people" },
      baseMoreNavItems[1]
    ];
  }
  return [baseMoreNavItems[0], requestItem, ...(platformItem ? [platformItem] : []), baseMoreNavItems[1]];
}
