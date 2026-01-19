"use client";

import React from "react"

import { Megaphone, Calendar, Users, HandHeart } from "lucide-react";

interface QuickBlock {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  accentClass: string;
  href: string;
}

const quickBlocks: QuickBlock[] = [
  {
    id: "announcements",
    label: "Announcements",
    count: 2,
    icon: <Megaphone className="h-5 w-5" />,
    accentClass: "bg-announcements text-announcements-foreground",
    href: "#announcements",
  },
  {
    id: "services",
    label: "Services",
    count: 3,
    icon: <Calendar className="h-5 w-5" />,
    accentClass: "bg-services text-services-foreground",
    href: "#services",
  },
  {
    id: "community",
    label: "Community",
    count: 2,
    icon: <Users className="h-5 w-5" />,
    accentClass: "bg-community text-community-foreground",
    href: "#community",
  },
  {
    id: "opportunities",
    label: "Opportunities",
    count: 1,
    icon: <HandHeart className="h-5 w-5" />,
    accentClass: "bg-opportunities text-opportunities-foreground",
    href: "#opportunities",
  },
];

export function QuickBlocksRow() {
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-x-visible lg:justify-start lg:gap-4">
      {quickBlocks.map((block) => (
        <button
          key={block.id}
          onClick={() => scrollToSection(block.href)}
          className={`flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-xl ${block.accentClass} transition-all hover:scale-[1.02] active:scale-[0.98] min-w-[90px] lg:min-w-[120px] lg:p-5 shadow-sm hover:shadow-md`}
        >
          <div className="relative">
            <span className="lg:hidden">{block.icon}</span>
            <span className="hidden lg:block">
              {React.cloneElement(block.icon as React.ReactElement, { className: "h-6 w-6" })}
            </span>
            <span className="absolute -top-2 -right-3 bg-card text-card-foreground text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center shadow-sm border border-border">
              {block.count}
            </span>
          </div>
          <span className="text-xs lg:text-sm font-medium text-center leading-tight">
            {block.label}
          </span>
        </button>
      ))}
    </div>
  );
}
