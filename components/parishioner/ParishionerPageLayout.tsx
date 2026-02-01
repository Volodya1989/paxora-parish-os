import { ReactNode } from "react";
import PageHeader from "@/components/header/PageHeader";

type ParishionerPageLayoutProps = {
  /** Page title shown in PageHeader */
  pageTitle: string;
  /** Parish name to display */
  parishName: string;
  /** Whether user is a leader (ADMIN/SHEPHERD). If true, hides PageHeader */
  isLeader: boolean;
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
  /** Page content */
  children: ReactNode;
};

/**
 * Standardized layout for parishioner-facing pages.
 * Eliminates repeated PageHeader and wrapper code across pages.
 *
 * The PageHeader is only shown for parishioners (non-leaders).
 * Leaders see the AppHeader at the layout level instead.
 *
 * Usage:
 * ```tsx
 * <ParishionerPageLayout
 *   pageTitle="Groups"
 *   parishName={parish.name}
 *   isLeader={canManage}
 *   subtitle="Connect with your community"
 *   quote="For where two or three are gathered..."
 *   quoteSource="Matthew 18:20"
 *   gradientClass="from-primary-600 via-primary-500 to-emerald-500"
 * >
 *   <YourPageContent />
 * </ParishionerPageLayout>
 * ```
 */
export default function ParishionerPageLayout({
  pageTitle,
  parishName,
  isLeader,
  subtitle,
  quote,
  quoteSource,
  gradientClass = "from-primary-600 via-primary-500 to-emerald-500",
  actions,
  children,
}: ParishionerPageLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Only show PageHeader for parishioners, not for leaders */}
      {!isLeader && (
        <PageHeader
          pageTitle={pageTitle}
          parishName={parishName}
          subtitle={subtitle}
          quote={quote}
          quoteSource={quoteSource}
          gradientClass={gradientClass}
          actions={actions}
        />
      )}
      {children}
    </div>
  );
}
