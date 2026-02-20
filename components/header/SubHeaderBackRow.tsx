"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

type SubHeaderBackRowProps = {
  backHref: string;
};

export default function SubHeaderBackRow({ backHref }: SubHeaderBackRowProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  }, [backHref, router]);

  return (
    <div className="px-4 pb-1 pt-2 md:px-6" role="navigation" aria-label="Back navigation">
      <button
        type="button"
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-600 transition hover:bg-mist-100 hover:text-ink-900 active:bg-mist-200 touch-manipulation"
        aria-label="Go back"
        onClick={handleBack}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
