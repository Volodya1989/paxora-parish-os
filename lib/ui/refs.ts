import type { Ref } from "react";

/**
 * Compose multiple refs into a single callback ref.
 */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T) => {
    refs.forEach((ref) => {
      if (!ref) {
        return;
      }
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as { current: T | null }).current = node;
      }
    });
  };
}
