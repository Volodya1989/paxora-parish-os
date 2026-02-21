export const IOS_SAFE_GIVING_STRATEGIES = {
  ALLOW: "allow",
  HIDE_IN_IOS_NATIVE: "hide_in_ios_native"
} as const;

export type IosSafeGivingStrategy =
  (typeof IOS_SAFE_GIVING_STRATEGIES)[keyof typeof IOS_SAFE_GIVING_STRATEGIES];

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isTrue(value: string | undefined): boolean {
  return normalize(value) === "true";
}

export function isIosNativeShellMode(): boolean {
  return isTrue(process.env.NEXT_PUBLIC_IOS_NATIVE_SHELL);
}

export function getIosSafeGivingStrategy(): IosSafeGivingStrategy {
  const strategy = normalize(process.env.NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY);

  if (strategy === IOS_SAFE_GIVING_STRATEGIES.HIDE_IN_IOS_NATIVE) {
    return IOS_SAFE_GIVING_STRATEGIES.HIDE_IN_IOS_NATIVE;
  }

  return IOS_SAFE_GIVING_STRATEGIES.ALLOW;
}

export function isGivingShortcutAllowed(): boolean {
  return !(
    getIosSafeGivingStrategy() === IOS_SAFE_GIVING_STRATEGIES.HIDE_IN_IOS_NATIVE &&
    isIosNativeShellMode()
  );
}
