"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { stopImpersonation } from "@/app/actions/platformImpersonation";

type ImpersonationBannerProps = {
  parishName: string | null;
};

export default function ImpersonationBanner({ parishName }: ImpersonationBannerProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const label = parishName ?? "selected parish";

  const handleStop = () => {
    startTransition(async () => {
      const result = await stopImpersonation();
      if (result.status === "error") {
        addToast({
          title: "Unable to end impersonation",
          description: result.message,
          status: "error"
        });
        return;
      }
      addToast({
        title: "Impersonation ended",
        description: `You are no longer impersonating ${label}.`,
        status: "success"
      });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:px-8">
      <div>
        <p className="font-semibold">Impersonation active</p>
        <p className="text-xs text-amber-800">
          You are viewing {label}. Actions will be logged for audit history.
        </p>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={handleStop} disabled={isPending}>
        End impersonation
      </Button>
    </div>
  );
}
