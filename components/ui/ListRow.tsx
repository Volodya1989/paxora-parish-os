import type { ReactNode } from "react";

type ListRowProps = {
  title: string;
  meta?: ReactNode;
  right?: ReactNode;
};

export default function ListRow({ title, meta, right }: ListRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-mist-100 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-ink-900">{title}</p>
        {meta ? <p className="mt-1 text-xs text-ink-500">{meta}</p> : null}
      </div>
      {right ? <div className="text-xs text-ink-500">{right}</div> : null}
    </div>
  );
}
