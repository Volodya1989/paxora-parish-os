export default function PilotBanner({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {message}
    </div>
  );
}
