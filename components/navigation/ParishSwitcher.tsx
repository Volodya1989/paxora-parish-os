"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveParish } from "@/app/actions/parish-switch";

export type ParishSwitcherOption = {
  id: string;
  name: string;
};

type ParishSwitcherProps = {
  activeParishId: string | null;
  options: ParishSwitcherOption[];
  label?: string;
  forceVisible?: boolean;
};

export default function ParishSwitcher({
  activeParishId,
  options,
  label = "Parish",
  forceVisible = false
}: ParishSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (options.length === 0) {
    return null;
  }

  if (!forceVisible && options.length <= 1) {
    return null;
  }

  return (
    <label className="flex flex-col gap-2 text-xs font-semibold text-ink-500">
      <span>{label}</span>
      <select
        className="w-full rounded-card border border-mist-200 bg-white px-3 py-2 text-sm text-ink-800 shadow-card focus-ring"
        value={activeParishId ?? ""}
        onChange={(event) => {
          const nextParishId = event.target.value;
          startTransition(async () => {
            await setActiveParish(nextParishId);
            router.refresh();
          });
        }}
        disabled={isPending}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
