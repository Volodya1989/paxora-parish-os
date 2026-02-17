"use client";

import { useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { ListChecksIcon } from "@/components/icons/ParishIcons";
import { cn } from "@/lib/ui/cn";
import { useTranslations } from "@/lib/i18n/provider";

type FiltersDrawerProps = {
  title?: string;
  triggerLabel?: string;
  children?: ReactNode;
  className?: string;
};

export default function FiltersDrawer({
  title,
  triggerLabel,
  children,
  className
}: FiltersDrawerProps) {
  const t = useTranslations();
  const resolvedTitle = title ?? t("header.filters");
  const resolvedTriggerLabel = triggerLabel ?? t("header.filters");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className={cn("h-9 gap-2 px-3 text-xs font-semibold sm:text-sm", className)}
      >
        <ListChecksIcon className="h-4 w-4" />
        {resolvedTriggerLabel}
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} title={resolvedTitle}>
        {children}
      </Drawer>
    </>
  );
}
