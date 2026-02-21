export type ShellContext = {
  platform: "ios" | "web";
  shell: "native_wrapper" | "browser";
  mode: "testflight_wrapper" | "web";
};

type SentryLikeEvent = {
  tags?: Record<string, string>;
};

const IOS_NATIVE_SHELL_ENV = process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL === "true";

export function getServerShellContext(): ShellContext {
  if (IOS_NATIVE_SHELL_ENV) {
    return {
      platform: "ios",
      shell: "native_wrapper",
      mode: "testflight_wrapper"
    };
  }

  return {
    platform: "web",
    shell: "browser",
    mode: "web"
  };
}

export function getClientShellContext(): ShellContext {
  if (typeof window !== "undefined") {
    const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (capacitor?.isNativePlatform?.() || IOS_NATIVE_SHELL_ENV) {
      return {
        platform: "ios",
        shell: "native_wrapper",
        mode: "testflight_wrapper"
      };
    }
  }

  return {
    platform: "web",
    shell: "browser",
    mode: "web"
  };
}

export function toSentryTags(context: ShellContext): Record<string, string> {
  return {
    app_platform: context.platform,
    app_shell: context.shell,
    app_mode: context.mode
  };
}

export function applyShellContextTags(event: SentryLikeEvent, context: ShellContext): SentryLikeEvent {
  return {
    ...event,
    tags: {
      ...event.tags,
      ...toSentryTags(context)
    }
  };
}
