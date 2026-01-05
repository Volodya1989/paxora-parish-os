import type { ReactNode } from "react";

type SectionTitleProps = {
  title: string;
  subtitle?: ReactNode;
};

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
    </header>
  );
}
