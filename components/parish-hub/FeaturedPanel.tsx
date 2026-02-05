import Link from "next/link";
import { SparklesIcon } from "@/components/icons/ParishIcons";

export type FeaturedPanelConfig = {
  title: string;
  meta: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  ctaExternal?: boolean;
};

type FeaturedPanelProps = {
  config: FeaturedPanelConfig;
};

/**
 * A minimal featured-content card for the Parish Hub.
 *
 * Renders a single highlighted item above the hub grid with a title,
 * meta line, description, and one call-to-action. Configured entirely
 * via a static `FeaturedPanelConfig` object — no backend required.
 */
export default function FeaturedPanel({ config }: FeaturedPanelProps) {
  const { title, meta, description, ctaLabel, ctaHref, ctaExternal } = config;

  const ctaClasses =
    "inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2";

  return (
    <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50/60 to-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        {/* Accent icon */}
        <div className="hidden shrink-0 sm:flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
          <SparklesIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Meta line */}
          <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
            {meta}
          </p>

          {/* Title */}
          <h2 className="text-lg font-semibold leading-snug text-ink-900 sm:text-xl">
            {title}
          </h2>

          {/* Description */}
          <p className="text-sm leading-relaxed text-ink-600">
            {description}
          </p>

          {/* CTA */}
          <div className="pt-1">
            {ctaExternal ? (
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClasses}
              >
                {ctaLabel}
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17L17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </a>
            ) : (
              <Link href={ctaHref} className={ctaClasses}>
                {ctaLabel}
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
