export const DAILY_QUOTE_HIDE_MS = 30_000;

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shouldShowDailyQuote(storedDateKey: string | null, todayKey: string): boolean {
  return storedDateKey !== todayKey;
}

export function scheduleDailyQuoteHide({
  hideAfterMs = DAILY_QUOTE_HIDE_MS,
  onHide
}: {
  hideAfterMs?: number;
  onHide: () => void;
}) {
  const timeout = globalThis.setTimeout(() => {
    onHide();
  }, hideAfterMs);

  return () => globalThis.clearTimeout(timeout);
}
