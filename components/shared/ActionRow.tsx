"use client";

import type { ReactNode } from "react";
import ParishionerAddButton from "@/components/shared/ParishionerAddButton";

type ActionRowProps = {
  left?: ReactNode;
  showAddButton?: boolean;
  onAdd?: () => void;
  addAriaLabel: string;
};

export default function ActionRow({ left, showAddButton = false, onAdd, addAriaLabel }: ActionRowProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2">
      <div className="flex items-center gap-2">{left}</div>
      {showAddButton && onAdd ? <ParishionerAddButton onClick={onAdd} ariaLabel={addAriaLabel} /> : <div className="h-11 min-w-11" aria-hidden="true" />}
    </div>
  );
}
