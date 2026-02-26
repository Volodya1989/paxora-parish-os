export default function MarketingMockFrame({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-card border border-mist-300 bg-gradient-to-br from-white to-mist-100 p-4 shadow-card">
      <div className="rounded-card border border-mist-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">{title}</p>
            <p className="text-xs text-ink-500">{subtitle}</p>
          </div>
          <div className="h-2 w-16 rounded-full bg-primary-100" />
        </div>

        <div className="space-y-3">
          <div className="h-3 w-3/4 rounded-full bg-mist-200" />
          <div className="h-3 w-2/3 rounded-full bg-mist-200" />
          <div className="h-24 rounded-card bg-mist-100" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 rounded-card bg-mist-100" />
            <div className="h-14 rounded-card bg-mist-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
