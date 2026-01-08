"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  buildAddHref,
  buildWeekHref,
  getPageTitle,
  normalizeWeekSelection
} from "@/components/header/headerUtils";

type AddTarget = "task" | "event" | "group";

const addTargets: Array<{ label: string; target: AddTarget; href: string }> = [
  { label: "Add task", target: "task", href: "/tasks" },
  { label: "Add event", target: "event", href: "/calendar" },
  { label: "Add group", target: "group", href: "/groups" }
];

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const weekSelection = normalizeWeekSelection(searchParams?.get("week") ?? null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleWeekChange = (value: string) => {
    const href = buildWeekHref(pathname, searchParams?.toString() ?? "", value as "current" | "next");
    router.push(href);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-mist-200 bg-white/70 px-4 py-4 shadow-card md:px-8">
      <div className="space-y-1">
        <p className="text-caption uppercase tracking-wide text-ink-400">
          Paxora Parish OS
        </p>
        <h1 className="text-h2">{getPageTitle(pathname)}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-ink-700">
          <span className="sr-only">Week switcher</span>
          <select
            className="rounded-button border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card focus-ring"
            value={weekSelection}
            onChange={(event) => handleWeekChange(event.target.value)}
          >
            <option value="current">This week</option>
            <option value="next">Next week</option>
          </select>
        </label>
        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            + Add
          </Button>
          {menuOpen ? (
            <div
              role="menu"
              aria-label="Add menu"
              className="absolute right-0 mt-2 w-48 rounded-card border border-mist-200 bg-white p-2 shadow-overlay"
            >
              {addTargets.map((item) => (
                <Link
                  key={item.target}
                  role="menuitem"
                  href={buildAddHref(item.href, searchParams?.toString() ?? "", item.target)}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-button px-3 py-2 text-sm text-ink-700 transition hover:bg-mist-50 focus-ring"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
