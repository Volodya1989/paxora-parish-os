const SDK_NAME = "custom.vendor.sentry-nextjs";
const SDK_VERSION = "10.39.0-vendor";

let currentOptions = {
  enabled: false,
  dsn: undefined,
  environment: undefined,
  release: undefined,
  initialScope: { tags: {} },
  beforeSend: undefined
};

function init(options = {}) {
  currentOptions = {
    ...currentOptions,
    ...options,
    initialScope: {
      tags: {
        ...(currentOptions.initialScope?.tags || {}),
        ...(options.initialScope?.tags || {})
      }
    }
  };

  if (typeof currentOptions.enabled !== "boolean") {
    currentOptions.enabled = Boolean(currentOptions.dsn);
  }
}

function parseDsn(dsn) {
  if (!dsn) {
    return null;
  }

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean).pop();

    if (!projectId || !url.username) {
      return null;
    }

    return {
      host: `${url.protocol}//${url.host}`,
      projectId,
      publicKey: url.username
    };
  } catch {
    return null;
  }
}

function buildEventFromException(error) {
  if (error instanceof Error) {
    return {
      exception: {
        values: [
          {
            type: error.name || "Error",
            value: error.message || "Unknown error",
            stacktrace: error.stack
              ? {
                  frames: error.stack
                    .split("\n")
                    .map((line) => ({ filename: line.trim() }))
                }
              : undefined
          }
        ]
      },
      message: error.message
    };
  }

  return {
    message: typeof error === "string" ? error : "Non-Error exception captured",
    extra: {
      raw: safeJson(error)
    }
  };
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildEvent(error) {
  const timestamp = new Date().toISOString();
  const random = Math.random().toString(16).slice(2, 10);
  const eventId = `${Date.now().toString(16)}${random}`.slice(0, 32).padEnd(32, "0");

  const baseEvent = {
    event_id: eventId,
    timestamp,
    platform: "javascript",
    level: "error",
    environment: currentOptions.environment,
    release: currentOptions.release,
    tags: {
      ...(currentOptions.initialScope?.tags || {})
    },
    ...buildEventFromException(error)
  };

  if (typeof currentOptions.beforeSend === "function") {
    const transformed = currentOptions.beforeSend(baseEvent);
    if (transformed === null) {
      return null;
    }

    return transformed;
  }

  return baseEvent;
}

function sendEnvelope(event) {
  const dsnInfo = parseDsn(currentOptions.dsn);
  if (!dsnInfo || !currentOptions.enabled || typeof fetch !== "function") {
    return;
  }

  const endpoint = `${dsnInfo.host}/api/${dsnInfo.projectId}/envelope/`;

  const header = {
    event_id: event.event_id,
    sent_at: new Date().toISOString(),
    sdk: {
      name: SDK_NAME,
      version: SDK_VERSION
    }
  };

  const itemHeader = { type: "event" };
  const envelope = `${JSON.stringify(header)}\n${JSON.stringify(itemHeader)}\n${JSON.stringify(event)}`;

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsnInfo.publicKey}, sentry_client=${SDK_NAME}/${SDK_VERSION}`
    },
    body: envelope,
    keepalive: true
  }).catch(() => {
    // Never throw from monitoring calls.
  });
}

function captureException(error) {
  const event = buildEvent(error);
  if (!event) {
    return "";
  }

  sendEnvelope(event);
  return event.event_id;
}

function captureRequestError(...args) {
  const [error] = args;
  if (error) {
    return captureException(error);
  }

  return "";
}

function withSentryConfig(nextConfig) {
  return nextConfig;
}

module.exports = {
  init,
  captureException,
  captureRequestError,
  withSentryConfig
};
