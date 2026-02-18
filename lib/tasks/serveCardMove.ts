export function getServeCardAnchorId(taskId: string) {
  return `serve-card-${taskId}`;
}

export function isTaskCardFullyVisible(rect: { top: number; bottom: number }, viewportHeight: number) {
  return rect.top >= 0 && rect.bottom <= viewportHeight;
}

export function getScrollBehavior(prefersReducedMotion: boolean): ScrollBehavior {
  return prefersReducedMotion ? "auto" : "smooth";
}
