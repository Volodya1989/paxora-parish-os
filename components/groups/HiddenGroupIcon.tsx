export default function HiddenGroupIcon() {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-mist-200 bg-mist-50 text-ink-500"
      title="Not publicly visible"
      aria-label="Not publicly visible"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 8s2.2-3.5 6.5-3.5S14.5 8 14.5 8s-2.2 3.5-6.5 3.5S1.5 8 1.5 8Z" />
        <circle cx="8" cy="8" r="1.8" />
        <path d="M2 2l12 12" />
      </svg>
    </span>
  );
}
