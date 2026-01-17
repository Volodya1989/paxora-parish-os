import { useEffect, useState } from "react";

export function useMediaQuery(query: string, defaultState = false) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") {
      return defaultState;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
