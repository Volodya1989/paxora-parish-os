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
  ContactIcon
} from "@/components/icons/ParishIcons";

export type ParishHubIcon =
  | "BULLETIN"
  | "MASS_TIMES"
  | "CONFESSION"
  | "WEBSITE"
  | "CALENDAR"
  | "READINGS"
  | "GIVING"
  | "CONTACT";

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

const iconMap: Record<ParishHubIcon, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  BULLETIN: BulletinIcon,
  MASS_TIMES: MassTimesIcon,
  CONFESSION: ConfessionIcon,
  WEBSITE: WebsiteIcon,
  CALENDAR: CalendarIcon,
  READINGS: ReadingsIcon,
  GIVING: GivingIcon,
  CONTACT: ContactIcon
};

export default function ParishHubTile({ item }: ParishHubTileProps) {
  const IconComponent = iconMap[item.icon] ?? BulletinIcon;

  const tileContent = (
    <div
      className={cn(
        "group flex flex-col items-center justify-center gap-3 rounded-card border border-mist-200 bg-white px-4 py-6 text-center shadow-card transition-all duration-200",
        "hover:border-primary-200 hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mist-50 text-ink-700 transition-colors group-hover:bg-primary-50 group-hover:text-primary-700">
        <IconComponent className="h-6 w-6" />
      </div>
      <span className="line-clamp-2 text-sm font-medium text-ink-700 transition-colors group-hover:text-ink-900">
        {item.label}
      </span>
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

  // Fallback for items without a valid target (shouldn't happen for enabled items)
  return tileContent;
}
