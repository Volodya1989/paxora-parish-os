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
    notifyMessageInApp: boolean;
    notifyTaskInApp: boolean;
    notifyAnnouncementInApp: boolean;
    notifyEventInApp: boolean;
    notifyRequestInApp: boolean;
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
    <div className="flex flex-col gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4 sm:flex-row sm:items-start sm:justify-between">
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
          "relative inline-flex h-6 w-11 shrink-0 items-center self-start rounded-full border transition focus-ring sm:self-center",
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
    key:
      | "notificationsEnabled"
      | "weeklyDigestEnabled"
      | "volunteerHoursOptIn"
      | "notifyMessageInApp"
      | "notifyTaskInApp"
      | "notifyAnnouncementInApp"
      | "notifyEventInApp"
      | "notifyRequestInApp"
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
          <CardTitle>Notifications & visibility</CardTitle>
          <CardDescription>Choose how we keep you informed and how your service appears to others.</CardDescription>
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
          <p className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            In-app notification categories
          </p>
          <ToggleRow
            label="Messages"
            description="Get in-app notifications for new chat messages."
            enabled={settings.notifyMessageInApp}
            disabled={isPending}
            onToggle={() => handleToggle("notifyMessageInApp")}
          />
          <ToggleRow
            label="Tasks"
            description="Get in-app notifications when tasks are assigned or updated."
            enabled={settings.notifyTaskInApp}
            disabled={isPending}
            onToggle={() => handleToggle("notifyTaskInApp")}
          />
          <ToggleRow
            label="Announcements"
            description="Get in-app notifications for newly published announcements."
            enabled={settings.notifyAnnouncementInApp}
            disabled={isPending}
            onToggle={() => handleToggle("notifyAnnouncementInApp")}
          />
          <ToggleRow
            label="Events"
            description="Get in-app notifications for new events and reminders."
            enabled={settings.notifyEventInApp}
            disabled={isPending}
            onToggle={() => handleToggle("notifyEventInApp")}
          />
          <ToggleRow
            label="Requests"
            description="Get in-app notifications for request status and assignment changes."
            enabled={settings.notifyRequestInApp}
            disabled={isPending}
            onToggle={() => handleToggle("notifyRequestInApp")}
          />
        </div>
      </div>
    </Card>
  );
}

export default ProfileSettings;
