"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import { cn } from "@/lib/ui/cn";
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
  NewsIcon
} from "@/components/icons/ParishIcons";

export type ParishHubIcon =
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

export type ParishHubItemData = {
  id: string;
  label: string;
  icon: ParishHubIcon;
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl: string | null;
  internalRoute: string | null;
};

type ParishHubTileProps = {
  item: ParishHubItemData;
};

type IconConfig = {
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  bgColor: string;
  iconColor: string;
  hoverBg: string;
  borderColor: string;
};

const iconConfigMap: Record<ParishHubIcon, IconConfig> = {
  BULLETIN: {
    Icon: BulletinIcon,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    hoverBg: "group-hover:bg-amber-100",
    borderColor: "border-amber-200"
  },
  MASS_TIMES: {
    Icon: MassTimesIcon,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    hoverBg: "group-hover:bg-emerald-100",
    borderColor: "border-emerald-200"
  },
  CONFESSION: {
    Icon: ConfessionIcon,
    bgColor: "bg-violet-50",
    iconColor: "text-violet-600",
    hoverBg: "group-hover:bg-violet-100",
    borderColor: "border-violet-200"
  },
  WEBSITE: {
    Icon: WebsiteIcon,
    bgColor: "bg-sky-50",
    iconColor: "text-sky-600",
    hoverBg: "group-hover:bg-sky-100",
    borderColor: "border-sky-200"
  },
  CALENDAR: {
    Icon: CalendarIcon,
    bgColor: "bg-teal-50",
    iconColor: "text-teal-600",
    hoverBg: "group-hover:bg-teal-100",
    borderColor: "border-teal-200"
  },
  READINGS: {
    Icon: ReadingsIcon,
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
    hoverBg: "group-hover:bg-indigo-100",
    borderColor: "border-indigo-200"
  },
  GIVING: {
    Icon: GivingIcon,
    bgColor: "bg-rose-50",
    iconColor: "text-rose-600",
    hoverBg: "group-hover:bg-rose-100",
    borderColor: "border-rose-200"
  },
  CONTACT: {
    Icon: ContactIcon,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
    hoverBg: "group-hover:bg-orange-100",
    borderColor: "border-orange-200"
  },
  FACEBOOK: {
    Icon: FacebookIcon,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    hoverBg: "group-hover:bg-blue-100",
    borderColor: "border-blue-200"
  },
  YOUTUBE: {
    Icon: YouTubeIcon,
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
    hoverBg: "group-hover:bg-red-100",
    borderColor: "border-red-200"
  },
  PRAYER: {
    Icon: PrayerIcon,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
    hoverBg: "group-hover:bg-purple-100",
    borderColor: "border-purple-200"
  },
  NEWS: {
    Icon: NewsIcon,
    bgColor: "bg-slate-50",
    iconColor: "text-slate-600",
    hoverBg: "group-hover:bg-slate-100",
    borderColor: "border-slate-200"
  }
};

export default function ParishHubTile({ item }: ParishHubTileProps) {
  const config = iconConfigMap[item.icon] ?? iconConfigMap.BULLETIN;
  const { Icon, bgColor, iconColor, hoverBg, borderColor } = config;

  const tileContent = (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center gap-3 rounded-2xl border bg-white px-4 py-6 text-center shadow-sm transition-all duration-200",
        borderColor,
        "hover:shadow-md hover:-translate-y-1 hover:scale-[1.02]",
        "focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2",
        "active:scale-[0.98]"
      )}
    >
      {/* Colored icon container */}
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-200",
          bgColor,
          hoverBg
        )}
      >
        <Icon className={cn("h-7 w-7", iconColor)} />
      </div>

      {/* Label */}
      <span className="line-clamp-2 text-sm font-medium text-ink-700 transition-colors group-hover:text-ink-900">
        {item.label}
      </span>

      {/* Subtle accent line at bottom on hover */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full transition-all duration-200 group-hover:w-12",
          iconColor.replace("text-", "bg-")
        )}
      />
    </div>
  );

  if (item.targetType === "INTERNAL" && item.internalRoute) {
    return (
      <Link href={item.internalRoute} className="focus:outline-none">
        {tileContent}
      </Link>
    );
  }

  if (item.targetType === "EXTERNAL" && item.targetUrl) {
    return (
      <a
        href={item.targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="focus:outline-none"
      >
        {tileContent}
      </a>
    );
  }

  return tileContent;
}
