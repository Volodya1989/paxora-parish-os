"use client";

import { useState, useTransition } from "react";
import type { ChatPollData } from "@/components/chat/types";
import { cn } from "@/lib/ui/cn";

export default function ChatPollCard({
  poll,
  onVote
}: {
  poll: ChatPollData;
  onVote: (pollId: string, optionId: string) => Promise<void> | void;
}) {
  const [isPending, startTransition] = useTransition();
  const [localPoll, setLocalPoll] = useState(poll);

  // Sync with parent when poll changes (e.g. from polling)
  const activePoll = poll.totalVotes !== localPoll.totalVotes ? poll : localPoll;

  const hasVoted = Boolean(activePoll.myVoteOptionId);
  const isExpired =
    activePoll.expiresAt && new Date(activePoll.expiresAt) < new Date();
  const showResults = hasVoted || Boolean(isExpired);
  const totalVotes = activePoll.totalVotes;

  const handleVote = (optionId: string) => {
    if (isPending || isExpired) return;

    // Optimistic update
    setLocalPoll((prev) => {
      const oldVoteOptionId = prev.myVoteOptionId;
      const nextOptions = prev.options.map((opt) => {
        let votes = opt.votes;
        if (opt.id === oldVoteOptionId) votes = Math.max(0, votes - 1);
        if (opt.id === optionId) votes += 1;
        return {
          ...opt,
          votes,
          votedByMe: opt.id === optionId
        };
      });
      const nextTotal = nextOptions.reduce((sum, o) => sum + o.votes, 0);
      return {
        ...prev,
        options: nextOptions,
        totalVotes: nextTotal,
        myVoteOptionId: optionId
      };
    });

    startTransition(async () => {
      await onVote(activePoll.id, optionId);
    });
  };

  return (
    <div className="mt-1 space-y-2 rounded-xl border border-mist-200 bg-white p-3">
      <p className="text-sm font-semibold text-ink-900">{activePoll.question}</p>

      <div className="space-y-1.5">
        {activePoll.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          const isMyVote = option.id === activePoll.myVoteOptionId;

          if (showResults) {
            return (
              <div key={option.id} className="relative overflow-hidden rounded-lg">
                {/* Background bar */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-lg",
                    isMyVote ? "bg-emerald-100" : "bg-mist-100"
                  )}
                  style={{ width: `${pct}%` }}
                />
                <button
                  type="button"
                  disabled={isPending || Boolean(isExpired)}
                  className={cn(
                    "relative flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                    isMyVote
                      ? "border-emerald-300 font-semibold text-emerald-800"
                      : "border-mist-200 text-ink-700",
                    !isExpired && "hover:border-emerald-300 active:bg-emerald-50/50"
                  )}
                  onClick={() => handleVote(option.id)}
                >
                  <span className="flex items-center gap-2">
                    {isMyVote ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-600" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                    ) : null}
                    {option.label}
                  </span>
                  <span className="text-xs text-ink-400">{pct}%</span>
                </button>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              type="button"
              disabled={isPending}
              className="flex w-full items-center rounded-lg border border-mist-200 px-3 py-2 text-left text-sm text-ink-700 transition hover:border-emerald-300 hover:bg-emerald-50/30 active:bg-emerald-50"
              onClick={() => handleVote(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-ink-400">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        {isExpired ? " · Poll ended" : ""}
      </p>
    </div>
  );
}
