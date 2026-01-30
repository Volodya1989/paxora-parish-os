"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/ui/cn";

type LeaderEntry = {
  userId: string;
  name: string;
  hours: number;
};

type HoursLeaderboardCardProps = {
  weekLeaders: LeaderEntry[];
  monthLeaders: LeaderEntry[];
};

export default function HoursLeaderboardCard({
  weekLeaders,
  monthLeaders
}: HoursLeaderboardCardProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink-900">Hours leaderboard (opt-in)</p>
          <p className="text-xs text-ink-500">Only opted-in members appear by name.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showLeaderboard}
          aria-label="Toggle leaderboard visibility"
          onClick={() => setShowLeaderboard((current) => !current)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full border transition focus-ring",
            showLeaderboard ? "border-primary-500 bg-primary-500" : "border-mist-200 bg-mist-200"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition",
              showLeaderboard ? "translate-x-5" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {showLeaderboard ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-ink-400">This week</p>
            {weekLeaders.length ? (
              <ul className="space-y-2">
                {weekLeaders.map((leader) => (
                  <li
                    key={leader.userId}
                    className="flex items-center justify-between rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-sm text-ink-700"
                  >
                    <span>{leader.name}</span>
                    <span className="text-xs font-semibold text-ink-600">
                      {leader.hours.toFixed(1)} hrs
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-500">No opted-in hours yet.</p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-ink-400">This month</p>
            {monthLeaders.length ? (
              <ul className="space-y-2">
                {monthLeaders.map((leader) => (
                  <li
                    key={leader.userId}
                    className="flex items-center justify-between rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-sm text-ink-700"
                  >
                    <span>{leader.name}</span>
                    <span className="text-xs font-semibold text-ink-600">
                      {leader.hours.toFixed(1)} hrs
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-500">No opted-in hours yet.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-500">
          Turn on the toggle to view opted-in contributors for the week and month.
        </p>
      )}
    </Card>
  );
}
