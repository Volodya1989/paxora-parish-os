"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export type EngagementVariant = "a2hs" | "notifications";

type EngagementModalProps = {
  open: boolean;
  variant: EngagementVariant;
  title: string;
  description: ReactNode;
  body?: ReactNode;
  primaryLabel: string;
  secondaryLabel: string;
  tertiaryLabel?: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onTertiary?: () => void;
  onClose: () => void;
};

export default function EngagementModal({
  open,
  variant,
  title,
  description,
  body,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  onPrimary,
  onSecondary,
  onTertiary,
  onClose
}: EngagementModalProps) {
  if (!open) {
    return null;
  }

  const footer = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
      {variant === "notifications" && tertiaryLabel && onTertiary ? (
        <Button type="button" variant="ghost" size="sm" onClick={onTertiary}>
          {tertiaryLabel}
        </Button>
      ) : null}
      <Button type="button" variant="secondary" size="sm" onClick={onSecondary}>
        {secondaryLabel}
      </Button>
      <Button type="button" size="sm" onClick={onPrimary}>
        {primaryLabel}
      </Button>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-black/30"
          aria-label="Close dialog"
          onClick={onClose}
        />
        <div className="relative w-full rounded-t-3xl border border-mist-200 bg-white px-5 pb-6 pt-4 shadow-overlay">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
              <p className="mt-1 text-sm text-ink-600">{description}</p>
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-mist-200 text-lg text-ink-500 transition hover:bg-mist-50 focus-ring"
            >
              ×
            </button>
          </div>
          {body ? <div className="mt-4 text-sm text-ink-700">{body}</div> : null}
          <div className="mt-6 flex flex-col gap-2">
            {variant === "notifications" && tertiaryLabel && onTertiary ? (
              <Button type="button" variant="ghost" size="sm" onClick={onTertiary}>
                {tertiaryLabel}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
            <Button type="button" size="sm" onClick={onPrimary}>
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>
      <Modal open={open} onClose={onClose} title={title} footer={footer}>
        <div className="space-y-3">
          <p>{description}</p>
          {body}
        </div>
      </Modal>
    </>
  );
}
