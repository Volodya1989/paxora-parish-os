"use client";

import { type ReactNode

 } from "react";
import LanguageIconToggle from "@/components/navigation/LanguageIconToggle";
import { cn } from "@/lib/ui/cn";

type PageHeaderProps = {
  /** Current page title */
  pageTitle: string;
  /** Parish name to display */
  parishName: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional right-aligned actions */
  actions?: ReactNode;
  /** Custom gradient colors (defaults to primary-emerald) */
  gradientClass?: string;
  /** Optional inspirational quote for parishioner-facing pages */
  quote?: string;
  /** Optional attribution for the quote */
  quoteSource?: string;
};

/**
 * Consistent page header for all parishioner-facing pages.
 * Features a welcoming gradient design with page title prominently displayed.
 *
 * Quote Rule (Parishioner-First Strategy):
 * - Each parishioner page may display AT MOST ONE quote
 * - Quotes must appear ONLY in PageHeader (never duplicated in page content)
 * - Quotes are inspirational/contextual to page purpose
 * - Quote attribution (quoteSource) is optional but recommended
 * - Quote placement enforces the "one header, one voice" principle
 */
export default function PageHeader({
  pageTitle,
  parishName,
  subtitle,
  actions,
  gradientClass = "from-primary-600 via-primary-500 to-emerald-500",
  quote,
  quoteSource
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "relative -mx-4 -mt-6 overflow-hidden bg-gradient-to-br px-5 pb-6 pt-5 text-white md:-mx-8 md:rounded-b-3xl md:px-8",
        gradientClass
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 left-1/4 h-20 w-20 rounded-full bg-white/5" />

      {/* Top bar with breadcrumb and actions */}
      <div className="relative mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="font-medium">{parishName}</span>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <LanguageIconToggle />
        </div>
      </div>

      {/* Page title */}
      <div className="relative">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {pageTitle}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        )}
        {quote && (
          <blockquote className="mt-4 border-l-4 border-white/40 pl-4 text-sm italic text-white/90">
            <p>{quote}</p>
            {quoteSource && (
              <footer className="mt-2 text-xs text-white/70">— {quoteSource}</footer>
            )}
          </blockquote>
        )}
      </div>
    </header>
  );
}
