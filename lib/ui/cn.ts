/**
 * Utility to join class names conditionally.
 */
export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}
