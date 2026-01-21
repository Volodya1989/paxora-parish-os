import { routes } from "@/lib/navigation/routes";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  primary?: boolean;
};

export const primaryNavItems: NavItem[] = [
  { label: "This Week", href: routes.thisWeek, icon: "TW", primary: true },
  { label: "Serve", href: routes.serve, icon: "SV" },
  { label: "Groups", href: routes.groups, icon: "GR" },
  { label: "Calendar", href: routes.calendar, icon: "CA" }
];

export type NavRole = "ADMIN" | "SHEPHERD" | "MEMBER" | null | undefined;

export function getPrimaryNavItems(role?: NavRole) {
  return primaryNavItems;
}

export const moreNavItems: NavItem[] = [
  { label: "Announcements", href: routes.announcements, icon: "AN" },
  { label: "Profile", href: "/profile", icon: "PR" }
];
