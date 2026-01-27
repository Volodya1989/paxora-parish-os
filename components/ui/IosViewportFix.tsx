"use client";

import { useEffect } from "react";

const IOS_INPUT_SELECTOR = "input, textarea, select";

function isIOSDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Mitigates iOS Safari stuck-zoom after focusing form fields.
 */
export default function IosViewportFix() {
  useEffect(() => {
    if (!isIOSDevice()) {
      return;
    }

    const handleBlur = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (!target.matches(IOS_INPUT_SELECTOR)) {
        return;
      }
      window.setTimeout(() => {
        window.scrollTo(window.scrollX, window.scrollY);
      }, 50);
    };

    window.addEventListener("focusout", handleBlur);

    return () => {
      window.removeEventListener("focusout", handleBlur);
    };
  }, []);

  return null;
}
