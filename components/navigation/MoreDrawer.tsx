"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { moreNavItems } from "@/components/navigation/navItems";
import { SignOutButton } from "@/components/navigation/SignOutButton";

type MoreDrawerProps = {
  open: boolean;
  onClose: () => void;
  onSignOut?: () => Promise<void> | void;
};

export function MoreDrawer({ open, onClose, onSignOut }: MoreDrawerProps) {
  const firstItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      firstItemRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close more menu"
        onClick={onClose}
      />
      <div
        id="more-drawer"
        role="dialog"
        aria-label="More"
        data-testid="more-drawer"
        className="absolute bottom-0 left-0 right-0 rounded-t-card border border-mist-200 bg-white px-4 pb-8 pt-5 shadow-overlay"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-mist-200" />
        <div className="space-y-2">
          {moreNavItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              ref={index === 0 ? firstItemRef : undefined}
              className="flex items-center justify-between rounded-card border border-mist-200 bg-mist-50 px-4 py-3 text-sm font-medium text-ink-800 shadow-card transition hover:bg-mist-100 focus-ring"
            >
              <span>{item.label}</span>
              <span className="text-xs text-ink-400" aria-hidden="true">
                {item.icon}
              </span>
            </Link>
          ))}
          <SignOutButton onSignOut={onSignOut} className="bg-white" />
        </div>
      </div>
    </div>
  );
}

export default MoreDrawer;
