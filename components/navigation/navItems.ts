export type NavItem = {
  label: string;
  href: string;
  icon: string;
  primary?: boolean;
};

export const primaryNavItems: NavItem[] = [
  { label: "This Week", href: "/this-week", icon: "TW", primary: true },
  { label: "Tasks", href: "/tasks", icon: "TK" },
  { label: "Groups", href: "/groups", icon: "GR" },
  { label: "Calendar", href: "/calendar", icon: "CA" }
];

export const moreNavItems: NavItem[] = [
  { label: "Announcements", href: "/announcements", icon: "AN" },
  { label: "Profile", href: "/profile", icon: "PR" }
];
