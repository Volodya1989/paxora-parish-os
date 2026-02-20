import { routes } from "@/lib/navigation/routes";

export type SectionThemeKey = "ThisWeek" | "Serve" | "Community" | "Events" | "ParishHub" | "More";

type SectionTheme = {
  headerGradient: string;
  headerAccentBubble: string;
  headerAccentGlow: string;
  headerIconBubble: string;
  navActiveIcon: string;
  navActiveLabel: string;
};

/**
 * Single source of truth for section styling used by both headers and mobile bottom navigation.
 *
 * Investigation notes:
 * - Header gradients were previously hardcoded per page route (tasks/groups/calendar).
 * - This Week used a separate header implementation with its own gradient/decorative accents.
 * - Mobile tabs mixed generic primary styling with ad-hoc per-route color overrides.
 */
export const sectionThemes: Record<SectionThemeKey, SectionTheme> = {
  ThisWeek: {
    headerGradient: "from-primary-600 via-primary-500 to-emerald-500",
    headerAccentBubble: "bg-white/10",
    headerAccentGlow: "bg-white/5",
    headerIconBubble: "bg-white/15 text-white",
    navActiveIcon: "border-primary-300 ring-2 ring-primary-200/70 bg-primary-50 text-primary-700",
    navActiveLabel: "text-primary-700"
  },
  Serve: {
    headerGradient: "from-sky-500 via-sky-400 to-cyan-500",
    headerAccentBubble: "bg-white/10",
    headerAccentGlow: "bg-white/5",
    headerIconBubble: "bg-white/15 text-white",
    navActiveIcon: "border-rose-300 ring-2 ring-rose-200/70 bg-rose-50 text-rose-700",
    navActiveLabel: "text-rose-700"
  },
  Community: {
    headerGradient: "from-sky-600 via-sky-500 to-cyan-500",
    headerAccentBubble: "bg-white/10",
    headerAccentGlow: "bg-white/5",
    headerIconBubble: "bg-white/15 text-white",
    navActiveIcon: "border-sky-300 ring-2 ring-sky-200/70 bg-sky-50 text-sky-700",
    navActiveLabel: "text-sky-700"
  },
  Events: {
    headerGradient: "from-teal-600 via-teal-500 to-emerald-500",
    headerAccentBubble: "bg-white/10",
    headerAccentGlow: "bg-white/5",
    headerIconBubble: "bg-white/15 text-white",
    navActiveIcon: "border-emerald-300 ring-2 ring-emerald-200/70 bg-emerald-50 text-emerald-700",
    navActiveLabel: "text-emerald-700"
  },
  ParishHub: {
    headerGradient: "from-primary-600 via-primary-500 to-emerald-500",
    headerAccentBubble: "bg-white/10",
    headerAccentGlow: "bg-white/5",
    headerIconBubble: "bg-white/15 text-white",
    navActiveIcon: "border-primary-300 ring-2 ring-primary-200/70 bg-primary-50 text-primary-700",
    navActiveLabel: "text-primary-700"
  },
  More: {
    headerGradient: "from-slate-600 via-slate-500 to-slate-400",
    headerAccentBubble: "bg-white/10",
    headerAccentGlow: "bg-white/5",
    headerIconBubble: "bg-white/15 text-white",
    navActiveIcon: "border-slate-300 ring-2 ring-slate-200/70 bg-slate-50 text-slate-700",
    navActiveLabel: "text-slate-700"
  }
};

export const sectionThemeByRoute: Record<string, SectionThemeKey> = {
  [routes.thisWeek]: "ThisWeek",
  [routes.serve]: "Serve",
  [routes.groups]: "Community",
  [routes.calendar]: "Events",
  [routes.parish]: "ParishHub"
};

export function resolveSectionTheme(pathname: string): SectionThemeKey {
  const matchedEntry = Object.entries(sectionThemeByRoute).find(([route]) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
  return matchedEntry?.[1] ?? "More";
}
