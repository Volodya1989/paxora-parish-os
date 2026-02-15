import { useEffect, useRef, useState } from "react";

const INPUT_SELECTOR = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select, [contenteditable="true"]';
const MOBILE_BREAKPOINT_PX = 768;

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.matches(INPUT_SELECTOR);
}

export function useKeyboardOpen() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

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

    const hasEditableFocus = () => isEditableTarget(document.activeElement);

    const evaluateKeyboardState = () => {
      const isMobileViewport = window.innerWidth < MOBILE_BREAKPOINT_PX;
      if (!isMobileViewport || !hasEditableFocus()) {
        setIsKeyboardOpen(false);
        return;
      }

      const visualViewport = window.visualViewport;
      if (!visualViewport) {
        setIsKeyboardOpen(true);
        return;
      }

      // On iOS Safari PWAs, fixed elements can jump above the keyboard.
      // VisualViewport lets us detect the reduced visible area and hide fixed tabs while typing.
      const keyboardHeight = window.innerHeight - visualViewport.height;
      const keyboardThreshold = Math.max(100, window.innerHeight * 0.12);
      setIsKeyboardOpen(keyboardHeight > keyboardThreshold);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableTarget(event.target)) {
        return;
      }
      clearBlurTimeout();
      evaluateKeyboardState();
    };

    const handleFocusOut = () => {
      clearBlurTimeout();
      blurTimeoutRef.current = window.setTimeout(() => {
        evaluateKeyboardState();
      }, 120);
    };

    const visualViewport = window.visualViewport;

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
