"use client";

import Link from "next/link";
import { routes } from "@/lib/navigation/routes";
import {
  BulletinIcon,
  MassTimesIcon,
  ConfessionIcon,
  WebsiteIcon,
  CalendarIcon,
  ReadingsIcon,
  GivingIcon,
  ContactIcon,
  FacebookIcon,
  YouTubeIcon,
  PrayerIcon,
  NewsIcon,
  LayoutGridIcon
} from "@/components/icons/ParishIcons";
import type { SVGProps, JSX } from "react";

type ParishHubIcon =
  | "BULLETIN"
  | "MASS_TIMES"
  | "CONFESSION"
  | "WEBSITE"
  | "CALENDAR"
  | "READINGS"
  | "GIVING"
  | "CONTACT"
  | "FACEBOOK"
  | "YOUTUBE"
  | "PRAYER"
  | "NEWS";

type HubItem = {
  id: string;
  label: string;
  icon: ParishHubIcon;
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl: string | null;
  internalRoute: string | null;
};

type ParishHubPreviewProps = {
  items: HubItem[];
  maxVisible?: number;
};

const iconMap: Record<ParishHubIcon, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  BULLETIN: BulletinIcon,
  MASS_TIMES: MassTimesIcon,
  CONFESSION: ConfessionIcon,
  WEBSITE: WebsiteIcon,
  CALENDAR: CalendarIcon,
  READINGS: ReadingsIcon,
  GIVING: GivingIcon,
  CONTACT: ContactIcon,
  FACEBOOK: FacebookIcon,
  YOUTUBE: YouTubeIcon,
  PRAYER: PrayerIcon,
  NEWS: NewsIcon
};

const iconColors: Record<ParishHubIcon, { bg: string; text: string; hover: string }> = {
  BULLETIN: { bg: "bg-amber-50", text: "text-amber-600", hover: "hover:bg-amber-100" },
  MASS_TIMES: { bg: "bg-primary-50", text: "text-primary-600", hover: "hover:bg-primary-100" },
  CONFESSION: { bg: "bg-violet-50", text: "text-violet-600", hover: "hover:bg-violet-100" },
  WEBSITE: { bg: "bg-sky-50", text: "text-sky-600", hover: "hover:bg-sky-100" },
  CALENDAR: { bg: "bg-teal-50", text: "text-teal-600", hover: "hover:bg-teal-100" },
  READINGS: { bg: "bg-rose-50", text: "text-rose-600", hover: "hover:bg-rose-100" },
  GIVING: { bg: "bg-pink-50", text: "text-pink-600", hover: "hover:bg-pink-100" },
  CONTACT: { bg: "bg-indigo-50", text: "text-indigo-600", hover: "hover:bg-indigo-100" },
  FACEBOOK: { bg: "bg-blue-50", text: "text-[#1877F2]", hover: "hover:bg-blue-100" },
  YOUTUBE: { bg: "bg-red-50", text: "text-[#FF0000]", hover: "hover:bg-red-100" },
  PRAYER: { bg: "bg-purple-50", text: "text-purple-600", hover: "hover:bg-purple-100" },
  NEWS: { bg: "bg-slate-50", text: "text-slate-600", hover: "hover:bg-slate-100" }
};

function HubTileCompact({ item }: { item: HubItem }) {
  const IconComponent = iconMap[item.icon];
  const colors = iconColors[item.icon];
  const href =
    item.targetType === "EXTERNAL" ? item.targetUrl : item.internalRoute;

  if (!href) return null;

  const isExternal = item.targetType === "EXTERNAL";

  const content = (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} ${colors.text} transition-colors ${colors.hover}`}
      >
        <IconComponent className="h-5 w-5" />
      </div>
      <span className="text-[11px] font-medium leading-tight text-ink-700 line-clamp-2">
        {item.label}
      </span>
    </div>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col items-center rounded-lg p-2 transition hover:bg-mist-50 focus-ring"
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="group flex flex-col items-center rounded-lg p-2 transition hover:bg-mist-50 focus-ring"
    >
      {content}
    </Link>
  );
}

export default function ParishHubPreview({ items, maxVisible = 6 }: ParishHubPreviewProps) {
  const visibleItems = items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-card border border-mist-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <LayoutGridIcon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-ink-900">Parish Hub</h3>
        </div>
        <Link
          href={routes.parish}
          className="text-xs font-medium text-primary-700 hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-1 sm:grid-cols-6">
        {visibleItems.map((item) => (
          <HubTileCompact key={item.id} item={item} />
        ))}
        {hasMore && (
          <Link
            href={routes.parish}
            className="group flex flex-col items-center rounded-lg p-2 transition hover:bg-mist-50 focus-ring"
          >
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist-100 text-ink-500 transition-colors group-hover:bg-mist-200">
                <span className="text-xs font-semibold">+{items.length - maxVisible}</span>
              </div>
              <span className="text-[11px] font-medium leading-tight text-ink-500">
                More
              </span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
