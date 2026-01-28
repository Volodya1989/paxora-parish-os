"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";

const MAX_LENGTH = 1000;

export default function Composer({
  disabled,
  onSend
}: {
  disabled: boolean;
  onSend: (body: string) => Promise<void> | void;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const remaining = MAX_LENGTH - message.length;
  const isDisabled = disabled || isPending;

  const handleSend = () => {
    if (isDisabled) {
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    startTransition(async () => {
      await onSend(trimmed);
      setMessage("");
    });
  };

  return (
    <div className="sticky bottom-0 border-t border-mist-100 bg-white py-4">
      <div className="space-y-3">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={disabled ? "This channel is locked." : "Write a message..."}
          maxLength={MAX_LENGTH}
          disabled={isDisabled}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-400">
          <span>{remaining} characters remaining</span>
          <Button type="button" size="sm" onClick={handleSend} disabled={isDisabled}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
