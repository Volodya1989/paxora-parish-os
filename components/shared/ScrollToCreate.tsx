"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

type ScrollToCreateProps = {
  targetId: string;
  triggerValue: string;
};

export function ScrollToCreate({ targetId, triggerValue }: ScrollToCreateProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("create") !== triggerValue) {
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if ("focus" in target) {
      (target as HTMLElement).focus();
    }
  }, [searchParams, targetId, triggerValue]);

  return null;
}
