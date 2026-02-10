const A2HS_PROMPT_KEY = "paxora.a2hsPrompt";
const NOTIF_PROMPT_KEY = "paxora.notifPrompt";
const SESSION_COUNT_KEY = "paxora.engagement.sessionCount";
const ROUTE_COUNT_KEY = "paxora.engagement.routeCounts";
const INSTALLED_AT_KEY = "paxora.pwa.installedAt";

const COOLDOWN_DAYS = 7;
const COOLDOWN_SESSIONS = 10;

export type PromptState = {
  lastShownAt?: number;
  lastShownSession?: number;
  dismissCount?: number;
  lastDismissedAt?: number;
  neverAskAgain?: boolean;
};

export type EngagementRouteKey = "announcements" | "calendar" | "requests";

const ROUTE_MATCHERS: Record<EngagementRouteKey, (pathname: string) => boolean> = {
  announcements: (pathname) => pathname.includes("/announcements"),
  calendar: (pathname) => pathname.includes("/calendar"),
  requests: (pathname) => pathname.includes("/requests")
};

function readState(key: string): PromptState {
  if (typeof window === "undefined") {
    return {};
  }
  const stored = window.localStorage.getItem(key);
  if (!stored) return {};

  try {
    return JSON.parse(stored) as PromptState;
  } catch {
    return {};
  }
}

function writeState(key: string, state: PromptState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(state));
}

export function incrementSessionCount(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const stored = window.localStorage.getItem(SESSION_COUNT_KEY);
  const current = stored ? Number(stored) : 0;
  const next = Number.isFinite(current) ? current + 1 : 1;
  window.localStorage.setItem(SESSION_COUNT_KEY, String(next));
  return next;
}

export function getSessionCount(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const stored = window.localStorage.getItem(SESSION_COUNT_KEY);
  const current = stored ? Number(stored) : 0;
  return Number.isFinite(current) ? current : 0;
}

export function markPromptShown(key: "a2hs" | "notifications", sessionCount: number) {
  const storageKey = key === "a2hs" ? A2HS_PROMPT_KEY : NOTIF_PROMPT_KEY;
  const state = readState(storageKey);
  writeState(storageKey, {
    ...state,
    lastShownAt: Date.now(),
    lastShownSession: sessionCount
  });
}

export function markPromptDismissed(key: "a2hs" | "notifications") {
  const storageKey = key === "a2hs" ? A2HS_PROMPT_KEY : NOTIF_PROMPT_KEY;
  const state = readState(storageKey);
  writeState(storageKey, {
    ...state,
    dismissCount: (state.dismissCount ?? 0) + 1,
    lastDismissedAt: Date.now()
  });
}

export function markPromptNeverAskAgain() {
  const state = readState(NOTIF_PROMPT_KEY);
  writeState(NOTIF_PROMPT_KEY, {
    ...state,
    neverAskAgain: true
  });
}

export function markInstalledAt() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(INSTALLED_AT_KEY, String(Date.now()));
}

export function getEngagementRouteKey(pathname: string): EngagementRouteKey | null {
  const entries = Object.entries(ROUTE_MATCHERS) as [EngagementRouteKey, (path: string) => boolean][];
  for (const [key, matcher] of entries) {
    if (matcher(pathname)) {
      return key;
    }
  }
  return null;
}

export function recordRouteVisit(routeKey: EngagementRouteKey): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const stored = window.localStorage.getItem(ROUTE_COUNT_KEY);
  let counts: Record<string, number> = {};
  if (stored) {
    try {
      counts = JSON.parse(stored) as Record<string, number>;
    } catch {
      counts = {};
    }
  }

  const nextCount = (counts[routeKey] ?? 0) + 1;
  counts[routeKey] = nextCount;
  window.localStorage.setItem(ROUTE_COUNT_KEY, JSON.stringify(counts));
  return nextCount;
}

function hasCooldownElapsed(state: PromptState, sessionCount: number): boolean {
  if (!state.lastShownAt) {
    return true;
  }

  const timeElapsed = Date.now() - state.lastShownAt;
  const daysElapsed = timeElapsed / (1000 * 60 * 60 * 24);
  if (daysElapsed >= COOLDOWN_DAYS) {
    return true;
  }

  if (state.lastShownSession !== undefined) {
    return sessionCount - state.lastShownSession >= COOLDOWN_SESSIONS;
  }

  return false;
}

export function shouldShowA2HS(sessionCount: number, isStandalone: boolean): boolean {
  if (isStandalone) {
    return false;
  }

  const state = readState(A2HS_PROMPT_KEY);
  if (!state.lastShownAt) {
    return true;
  }

  return hasCooldownElapsed(state, sessionCount);
}

export function shouldShowNotifications(options: {
  sessionCount: number;
  isStandalone: boolean;
  permission: NotificationPermission | "unsupported";
  highIntent: boolean;
}): boolean {
  const { sessionCount, isStandalone, permission, highIntent } = options;

  if (!isStandalone) {
    return false;
  }

  if (!highIntent) {
    return false;
  }

  if (permission === "granted" || permission === "denied" || permission === "unsupported") {
    return false;
  }

  const state = readState(NOTIF_PROMPT_KEY);
  if (state.neverAskAgain) {
    return false;
  }

  if (!state.lastShownAt) {
    return true;
  }

  return hasCooldownElapsed(state, sessionCount);
}
