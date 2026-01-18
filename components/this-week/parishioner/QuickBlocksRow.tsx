import Link from "next/link";

type QuickBlock = {
  id: string;
  label: string;
  href: string;
  summary: string;
};

type QuickBlocksRowProps = {
  blocks: QuickBlock[];
};

export default function QuickBlocksRow({ blocks }: QuickBlocksRowProps) {
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {blocks.map((block) => (
        <Link
          key={block.id}
          href={block.href}
          className="min-w-[200px] flex-1 rounded-card border border-mist-200 bg-white px-4 py-4 shadow-card transition hover:border-primary-200 hover:bg-primary-50/30 focus-ring"
        >
          <p className="text-sm font-semibold text-ink-900">{block.label}</p>
          <p className="mt-2 text-xs text-ink-500">{block.summary}</p>
        </Link>
      ))}
    </div>
  );
}
