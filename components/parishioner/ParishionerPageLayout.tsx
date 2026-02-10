import { ReactNode } from "react";
import PageHeader from "@/components/header/PageHeader";

type ParishionerPageLayoutProps = {
  /** Page title shown in PageHeader */
  pageTitle: string;
  /** Parish name to display */
  parishName: string;
  /** Optional parish logo URL (falls back to Paxora logo) */
  parishLogoUrl?: string | null;
  /** @deprecated No longer used — both roles see PageHeader now */
  isLeader?: boolean;
  /** Optional subtitle for the page */
  subtitle?: string;
  /** Optional inspirational quote */
  quote?: string;
  /** Quote attribution (e.g., "Luke 16:10") */
  quoteSource?: string;
  /** Gradient class for header (e.g., "from-sky-500 via-sky-400 to-cyan-500") */
  gradientClass?: string;
  /** Optional actions to show in header (e.g., view toggles) */
  actions?: ReactNode;
  /** Optional icon to display next to the title */
  icon?: ReactNode;
  /** Fallback href for back button. When set, a back arrow appears top-left. */
  backHref?: string;
  /** Page content */
  children: ReactNode;
};

/**
 * Standardized layout for all pages (both leaders and parishioners).
 * Everyone sees the same warm gradient PageHeader — same product, same style.
 * Admin-specific capabilities are layered on top within the page content.
 */
export default function ParishionerPageLayout({
  pageTitle,
  parishName,
  parishLogoUrl,
  subtitle,
  quote,
  quoteSource,
  gradientClass = "from-primary-600 via-primary-500 to-emerald-500",
  actions,
  icon,
  backHref,
  children,
}: ParishionerPageLayoutProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        pageTitle={pageTitle}
        parishName={parishName}
        parishLogoUrl={parishLogoUrl}
        subtitle={subtitle}
        quote={quote}
        quoteSource={quoteSource}
        gradientClass={gradientClass}
        actions={actions}
        icon={icon}
        backHref={backHref}
      />
      {children}
    </div>
  );
}
