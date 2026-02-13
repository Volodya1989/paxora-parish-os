function getBadgeNavigator(): (Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}) | null {
  if (typeof navigator === "undefined") return null;
  return navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
}

export async function updateAppBadge(count: number, source = "client"): Promise<void> {
  if (!Number.isFinite(count)) return;

  const badgeNavigator = getBadgeNavigator();
  if (!badgeNavigator) return;

  try {
    if (count <= 0) {
      if (typeof badgeNavigator.clearAppBadge === "function") {
        await badgeNavigator.clearAppBadge();
      }
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[badge] cleared from ${source}`);
      }
      return;
    }

    if (typeof badgeNavigator.setAppBadge === "function") {
      await badgeNavigator.setAppBadge(count);
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[badge] set to ${count} from ${source}`);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[badge] failed to update app badge", { count, source, error });
    }
  }
}
