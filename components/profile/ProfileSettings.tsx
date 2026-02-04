"use client";

import React, { useState, useTransition } from "react";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { updateProfileSettings } from "@/app/actions/profile";
import { cn } from "@/lib/ui/cn";
import PushNotificationToggle from "@/components/push/PushNotificationToggle";

type ProfileSettingsProps = {
  initialSettings: {
    notificationsEnabled: boolean;
    weeklyDigestEnabled: boolean;
    volunteerHoursOptIn: boolean;
  };
};

type ToggleProps = {
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
};

function ToggleRow({ label, description, enabled, disabled, onToggle }: ToggleProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4">
      <div>
        <p className="text-sm font-medium text-ink-900">{label}</p>
        <p className="text-sm text-ink-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full border transition focus-ring",
          enabled ? "border-primary-500 bg-primary-500" : "border-mist-200 bg-mist-200",
          disabled ? "opacity-60" : "hover:border-primary-400"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition",
            enabled ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export function ProfileSettings({ initialSettings }: ProfileSettingsProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const handleToggle = (
    key: "notificationsEnabled" | "weeklyDigestEnabled" | "volunteerHoursOptIn"
  ) => {
    const nextSettings = {
      ...settings,
      [key]: !settings[key]
    };

    startTransition(async () => {
      try {
        const updated = await updateProfileSettings(nextSettings);
        setSettings(updated);
        addToast({
          title: "Settings saved",
          description: "Your notification preferences were updated.",
          status: "success"
        });
      } catch (error) {
        addToast({
          title: "Unable to save settings",
          description: "Please try again in a moment.",
          status: "error"
        });
      }
    });
  };

  return (
    <Card>
      <div className="space-y-6">
        <CardHeader>
          <CardTitle>Notification settings</CardTitle>
          <CardDescription>Choose how we should keep you informed.</CardDescription>
        </CardHeader>
        <div className="space-y-3">
          <div className="rounded-card border border-mist-200 bg-mist-50/60 p-4">
            <PushNotificationToggle />
          </div>
          <ToggleRow
            label="Notification emails"
            description="Receive important parish updates via email."
            enabled={settings.notificationsEnabled}
            disabled={isPending}
            onToggle={() => handleToggle("notificationsEnabled")}
          />
          <ToggleRow
            label="Weekly digest emails"
            description="Get a weekly roundup of parish announcements."
            enabled={settings.weeklyDigestEnabled}
            disabled={isPending}
            onToggle={() => handleToggle("weeklyDigestEnabled")}
          />
          <ToggleRow
            label="Share hours on leaderboards"
            description="Opt in to be listed by name on gratitude leaderboards."
            enabled={settings.volunteerHoursOptIn}
            disabled={isPending}
            onToggle={() => handleToggle("volunteerHoursOptIn")}
          />
        </div>
      </div>
    </Card>
  );
}

export default ProfileSettings;
