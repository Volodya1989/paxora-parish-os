import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

type QuoteTone = "primary" | "sky";

type QuoteCardProps = HTMLAttributes<HTMLDivElement> & {
  quote: string;
  source?: string;
  tone?: QuoteTone;
};

const toneStyles: Record<QuoteTone, { wrapper: string; source: string }> = {
  primary: {
    wrapper: "border-l-primary-400 border-primary-100 bg-gradient-to-br from-primary-50 to-emerald-50/60",
    source: "text-primary-600/70"
  },
  sky: {
    wrapper: "border-l-sky-400 border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50/60",
    source: "text-sky-600/70"
  }
};

export default function QuoteCard({
  quote,
  source,
  tone = "primary",
  className,
  ...props
}: QuoteCardProps) {
  const toneClass = toneStyles[tone];

  return (
    <div
      className={cn(
        "rounded-card border-l-4 border px-5 py-4 shadow-card",
        toneClass.wrapper,
        className
      )}
      {...props}
    >
      <p className="text-sm italic leading-relaxed text-ink-700">&ldquo;{quote}&rdquo;</p>
      {source ? (
        <footer className={cn("mt-1.5 text-xs font-medium", toneClass.source)}>
          — {source}
        </footer>
      ) : null}
    </div>
  );
}
