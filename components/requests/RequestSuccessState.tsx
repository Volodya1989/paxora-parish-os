"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { CheckCircleIcon } from "@/components/icons/ParishIcons";

type RequestSuccessStateProps = {
  title: string;
  message: ReactNode;
  doneLabel: string;
  onDone: () => void;
};

export default function RequestSuccessState({ title, message, doneLabel, onDone }: RequestSuccessStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircleIcon className="h-7 w-7 text-emerald-600" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
        <p className="max-w-sm text-sm leading-relaxed text-ink-500">{message}</p>
      </div>
      <Button onClick={onDone} className="mt-2">
        {doneLabel}
      </Button>
    </div>
  );
}
