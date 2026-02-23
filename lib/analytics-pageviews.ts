export function createPageViewTracker(trackPage: (path: string) => void) {
  let lastPath: string | null = null;

  return (pathname: string, search: string) => {
    const fullPath = search ? `${pathname}?${search}` : pathname;
    if (lastPath === fullPath) {
      return;
    }
    lastPath = fullPath;
    trackPage(fullPath);
  };
}
