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

function createPosthogTransport(env: AnalyticsEnv, getWindow: () => Window | undefined): Transport {
  return async (payload) => {
    if (!env.key) return;
    const windowObject = getWindow();
    if (!windowObject) return;

    const host = env.host || "https://us.i.posthog.com";
    const endpoint = `${host.replace(/\/$/, "")}/capture/`;
    const fullPayload = {
      api_key: env.key,
      event: payload.event,
      properties: {
        ...payload.properties,
        token: env.key
      }
    };

    const body = JSON.stringify(fullPayload);
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

export function createAnalyticsClient({
  env,
  transport,
  getWindow
}: {
  env: AnalyticsEnv;
  transport: Transport;
  getWindow: () => Window | undefined;
}): AnalyticsClient {
  let globalProperties: AnalyticsProperties = {};

  const isEnabled = () => env.enabled === "true" && Boolean(env.key);

  const send = (event: string, properties?: AnalyticsProperties) => {
    if (!isEnabled() || !getWindow()) return;

    const mergedProperties = Object.fromEntries(
      Object.entries({ ...globalProperties, ...properties }).filter(([, value]) => value !== undefined)
    );

    void transport({ event, properties: mergedProperties }).catch(() => {
      // Never block UX on analytics failures.
    });
  };

  return {
    isEnabled,
    init: async () => {
      // No heavy SDK init required for lightweight transport.
    },
    identify: (distinctId, properties) => {
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
  getWindow: () => (typeof window === "undefined" ? undefined : window)
});
