"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EventRsvpResponse } from "@prisma/client";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { setRsvp } from "@/app/actions/rsvp";
import { cn } from "@/lib/ui/cn";
import { trackRsvpSubmitted } from "@/lib/analytics-events";

type RsvpButtonsProps = {
  eventId: string;
  initialResponse?: EventRsvpResponse | null;
  className?: string;
  onRsvpUpdated?: (count: number) => void;
};

const options: Array<{ response: EventRsvpResponse; label: string }> = [
  { response: "YES", label: "RSVP Yes" },
  { response: "MAYBE", label: "RSVP Maybe" },
  { response: "NO", label: "RSVP No" }
];

export default function RsvpButtons({
  eventId,
  initialResponse,
  className,
  onRsvpUpdated
}: RsvpButtonsProps) {
  const [currentResponse, setCurrentResponse] = useState<EventRsvpResponse | null>(
    initialResponse ?? null
  );
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setCurrentResponse(initialResponse ?? null);
  }, [initialResponse]);

  const selectedClasses = "border-primary-200 bg-primary-50 text-primary-700";

  const handleSelect = (response: EventRsvpResponse) => {
    if (isPending) {
      return;
    }
    if (currentResponse === response) {
      addToast({
        title: "RSVP already saved",
        description: "Your choice was already saved.",
        status: "info"
      });
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await setRsvp({ eventId, response });
        setCurrentResponse(result.response);
        onRsvpUpdated?.(result.rsvpTotalCount);
        trackRsvpSubmitted({
          eventId,
          response
        });
        router.refresh();
        addToast({
          title: "RSVP saved",
          description: "Your response has been recorded.",
          status: "success"
        });
      })();
    });
  };

  return (
    <div className={cn("flex flex-wrap gap-3", className)} role="group" aria-label="RSVP">
      {options.map(({ response, label }) => {
        const isSelected = currentResponse === response;
        return (
          <Button
            key={response}
            type="button"
            variant="secondary"
            disabled={isPending}
            aria-pressed={isSelected}
            aria-label={label}
            data-testid={`rsvp-${response.toLowerCase()}`}
            className={cn("min-w-[120px]", isSelected ? selectedClasses : "")}
            onClick={() => handleSelect(response)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
