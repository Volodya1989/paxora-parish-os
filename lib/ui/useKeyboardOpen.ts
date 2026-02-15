import { useEffect, useRef, useState } from "react";

const EDITABLE_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select, [contenteditable]:not([contenteditable="false"])';
const MOBILE_BREAKPOINT_PX = 768;

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.matches(EDITABLE_SELECTOR);
}

export function useKeyboardOpen() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const hasEditableFocusRef = useRef(false);
  const maxVisualViewportHeightRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const clearBlurTimeout = () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };

    const syncFocusStateFromActiveElement = () => {
      hasEditableFocusRef.current = isEditableTarget(document.activeElement);
    };

    const evaluateKeyboardState = () => {
      const isMobileViewport = window.innerWidth < MOBILE_BREAKPOINT_PX;
      if (!isMobileViewport) {
        hasEditableFocusRef.current = false;
        setIsKeyboardOpen(false);
        return;
      }

      const visualViewport = window.visualViewport;
      const hasEditableFocus =
        hasEditableFocusRef.current || isEditableTarget(document.activeElement);

      if (!hasEditableFocus) {
        setIsKeyboardOpen(false);
        if (visualViewport) {
          maxVisualViewportHeightRef.current = Math.max(
            maxVisualViewportHeightRef.current ?? 0,
            visualViewport.height
          );
        }
        return;
      }

      if (!visualViewport) {
        setIsKeyboardOpen(true);
        return;
      }

      const baselineHeight = Math.max(
        maxVisualViewportHeightRef.current ?? 0,
        visualViewport.height
      );
      maxVisualViewportHeightRef.current = baselineHeight;

      // On iOS Safari/PWA, `innerHeight` can track the reduced viewport while keyboard is open.
      // Comparing against the largest observed visual viewport avoids false negatives.
      const viewportHeightDelta = baselineHeight - visualViewport.height;
      const innerHeightDelta = window.innerHeight - visualViewport.height;
      const keyboardThreshold = Math.max(80, baselineHeight * 0.1);
      const hasViewportShift = visualViewport.offsetTop > 0;

      setIsKeyboardOpen(
        viewportHeightDelta > keyboardThreshold ||
          innerHeightDelta > keyboardThreshold ||
          hasViewportShift
      );
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableTarget(event.target)) {
        hasEditableFocusRef.current = true;
      }
      clearBlurTimeout();
      evaluateKeyboardState();
    };

    const handleFocusOut = () => {
      clearBlurTimeout();
      blurTimeoutRef.current = window.setTimeout(() => {
        syncFocusStateFromActiveElement();
        evaluateKeyboardState();
      }, 120);
    };

    const visualViewport = window.visualViewport;
    if (visualViewport) {
      maxVisualViewportHeightRef.current = visualViewport.height;
    }

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", evaluateKeyboardState);
    window.addEventListener("orientationchange", evaluateKeyboardState);
    visualViewport?.addEventListener("resize", evaluateKeyboardState);
    visualViewport?.addEventListener("scroll", evaluateKeyboardState);

    evaluateKeyboardState();

    return () => {
      clearBlurTimeout();
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", evaluateKeyboardState);
      window.removeEventListener("orientationchange", evaluateKeyboardState);
      visualViewport?.removeEventListener("resize", evaluateKeyboardState);
      visualViewport?.removeEventListener("scroll", evaluateKeyboardState);
    };
  }, []);

  return isKeyboardOpen;
}
