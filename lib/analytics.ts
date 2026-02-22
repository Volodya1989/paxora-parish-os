"use client";

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

type AnalyticsEnv = {
  enabled?: string;
  key?: string;
  host?: string;
};

export type AnalyticsClient = {
  isEnabled: () => boolean;
  init: () => Promise<void>;
  identify: (distinctId: string, properties?: AnalyticsProperties) => void;
  page: (path: string, properties?: AnalyticsProperties) => void;
  track: (eventName: string, properties?: AnalyticsProperties) => void;
  setGlobalProperties: (properties: AnalyticsProperties) => void;
};

type Transport = (payload: { event: string; properties: AnalyticsProperties }) => Promise<void>;

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const DISTINCT_ID_STORAGE_KEY = "paxora.analytics.distinctId";

function createPosthogTransport(env: AnalyticsEnv, getWindow: () => Window | undefined): Transport {
  return async (payload) => {
    if (!env.key) return;
    const windowObject = getWindow();
    if (!windowObject) return;

    const host = env.host || "https://us.i.posthog.com";
    const endpoint = `${host.replace(/\/$/, "")}/capture/`;
    const body = JSON.stringify({
      api_key: env.key,
      event: payload.event,
      properties: {
        ...payload.properties,
        token: env.key
      }
    });

    const beaconOk =
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));

    if (beaconOk) {
      return;
    }

    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    });
  };
}

function generateDistinctId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getDistinctIdFromStorage(storage?: StorageLike): string {
  if (!storage) {
    return generateDistinctId();
  }

  const existing = storage.getItem(DISTINCT_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = generateDistinctId();
  storage.setItem(DISTINCT_ID_STORAGE_KEY, created);
  return created;
}

export function createAnalyticsClient({
  env,
  transport,
  getWindow,
  getStorage
}: {
  env: AnalyticsEnv;
  transport: Transport;
  getWindow: () => Window | undefined;
  getStorage?: () => StorageLike | undefined;
}): AnalyticsClient {
  let globalProperties: AnalyticsProperties = {};
  let identifiedDistinctId: string | null = null;

  const isEnabled = () => env.enabled === "true" && Boolean(env.key);

  const resolveDistinctId = () => {
    if (identifiedDistinctId) {
      return identifiedDistinctId;
    }
    return getDistinctIdFromStorage(getStorage?.());
  };

  const send = (event: string, properties?: AnalyticsProperties) => {
    if (!isEnabled() || !getWindow()) return;

    const mergedProperties = Object.fromEntries(
      Object.entries({
        distinct_id: resolveDistinctId(),
        ...globalProperties,
        ...properties
      }).filter(([, value]) => value !== undefined)
    );

    void transport({ event, properties: mergedProperties }).catch(() => {
      // Never block UX on analytics failures.
    });
  };

  return {
    isEnabled,
    init: async () => {
      if (!isEnabled() || !getWindow()) {
        return;
      }
      resolveDistinctId();
    },
    identify: (distinctId, properties) => {
      identifiedDistinctId = distinctId;
      send("$identify", {
        distinct_id: distinctId,
        ...properties
      });
    },
    page: (path, properties) => {
      send("page_viewed", {
        path,
        ...properties
      });
    },
    track: (eventName, properties) => {
      send(eventName, properties);
    },
    setGlobalProperties: (properties) => {
      globalProperties = Object.fromEntries(
        Object.entries({ ...globalProperties, ...properties }).filter(([, value]) => value !== undefined)
      );
    }
  };
}

export const analytics = createAnalyticsClient({
  env: {
    enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST
  },
  transport: createPosthogTransport(
    {
      enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST
    },
    () => (typeof window === "undefined" ? undefined : window)
  ),
  getWindow: () => (typeof window === "undefined" ? undefined : window),
  getStorage: () => (typeof window === "undefined" ? undefined : window.localStorage)
});
