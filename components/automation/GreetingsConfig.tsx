"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AvatarUploadField from "@/components/shared/AvatarUploadField";
import { useToast } from "@/components/ui/Toast";
import { updateParishGreetingConfig } from "@/app/actions/parishGreetings";
import { buildQuarterHourTimeOptions, isValidTimezone } from "@/lib/email/greetingSchedule";
import { cn } from "@/lib/ui/cn";
import {
  buildParishTimezoneOptions,
  formatCurrentTimeInTimezone,
  getNextRunPreview,
  isLegacyUtcOffsetTimezone
} from "@/lib/time/parishTimezones";

type GreetingsConfigProps = {
  parishId: string;
  parishName: string;
  parishTimezone: string;
  logoUrl: string | null;
  greetingsEnabled: boolean;
  birthdayGreetingTemplate: string | null;
  anniversaryGreetingTemplate: string | null;
  greetingsSendTimeLocal: string;
  emailsPlannedToday: number;
  emailsSentToday: number;
  latestGreetingSentAt: string | null;
};

export default function GreetingsConfig({
  parishId,
  parishName,
  parishTimezone,
  logoUrl,
  greetingsEnabled: initialEnabled,
  birthdayGreetingTemplate,
  anniversaryGreetingTemplate,
  greetingsSendTimeLocal,
  emailsPlannedToday,
  emailsSentToday,
  latestGreetingSentAt
}: GreetingsConfigProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const [savedState, setSavedState] = useState({
    greetingsEnabled: initialEnabled,
    birthdayTemplate: birthdayGreetingTemplate ?? "",
    anniversaryTemplate: anniversaryGreetingTemplate ?? "",
    sendTime: greetingsSendTimeLocal,
    timezone: parishTimezone || "UTC"
  });
  const [formState, setFormState] = useState(savedState);

  const timeOptions = useMemo(() => buildQuarterHourTimeOptions(), []);
  const timezoneOptions = useMemo(() => buildParishTimezoneOptions(), []);

  useEffect(() => {
    if (!savedState.timezone || savedState.timezone === "UTC") {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTimezone && isValidTimezone(browserTimezone)) {
        setSavedState((current) => ({ ...current, timezone: browserTimezone }));
        setFormState((current) => ({ ...current, timezone: browserTimezone }));
      }
    }
  }, [savedState.timezone]);

  const currentParishTime = useMemo(() => {
    return formatCurrentTimeInTimezone(formState.timezone);
  }, [formState.timezone]);

  const nextRunPreview = useMemo(() => {
    return getNextRunPreview(formState.timezone, formState.sendTime);
  }, [formState.timezone, formState.sendTime]);

  const latestGreetingSentLabel = useMemo(() => {
    if (!latestGreetingSentAt) {
      return null;
    }

    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: formState.timezone,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(latestGreetingSentAt));
    } catch {
      return null;
    }
  }, [latestGreetingSentAt, formState.timezone]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateParishGreetingConfig({
          greetingsEnabled: formState.greetingsEnabled,
          birthdayGreetingTemplate: formState.birthdayTemplate,
          anniversaryGreetingTemplate: formState.anniversaryTemplate,
          greetingsSendTimeLocal: formState.sendTime,
          parishTimezone: formState.timezone
        });
        setSavedState(formState);
        setIsEditing(false);
        addToast({
          title: "Greeting settings saved",
          description: "Your automation configuration was updated.",
          status: "success"
        });
      } catch (error) {
        addToast({
          title: "Unable to save settings",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  const handleCancel = () => {
    setFormState(savedState);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <CardHeader>
            <CardTitle>Greeting emails</CardTitle>
            <CardDescription>
              Automatically send birthday and anniversary emails to parishioners who opt in.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setIsEditing(true)}
                disabled={isEditing}
              >
                Edit settings
              </Button>
              {!isEditing ? <span className="text-xs text-ink-400">Saved settings are read-only.</span> : null}
            </div>
          </CardHeader>

          <div className="flex flex-col gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink-900">Enable greeting emails</p>
              <p className="text-sm text-ink-500">When disabled, no greeting emails will be sent for this parish.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formState.greetingsEnabled}
              aria-label="Enable greeting emails"
              onClick={() =>
                setFormState((current) =>
                  isEditing ? { ...current, greetingsEnabled: !current.greetingsEnabled } : current
                )
              }
              disabled={isPending || !isEditing}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center self-start rounded-full border transition focus-ring sm:self-center",
                formState.greetingsEnabled ? "border-primary-500 bg-primary-500" : "border-mist-200 bg-mist-200",
                isPending ? "opacity-60" : "hover:border-primary-400"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition",
                  formState.greetingsEnabled ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm text-ink-700">
              <span className="font-medium">Send time (parish local)</span>
              <select
                value={formState.sendTime}
                onChange={(event) => setFormState((s) => ({ ...s, sendTime: event.target.value }))}
                disabled={!isEditing}
                className="w-full rounded-button border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card transition focus-ring disabled:cursor-not-allowed disabled:bg-mist-50"
              >
                {timeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-500">Emails are sent at this time in parish local time.</p>
            </label>

            <label className="block space-y-1 text-sm text-ink-700">
              <span className="font-medium">Parish timezone</span>
              <input
                list="parish-timezone-options"
                value={formState.timezone}
                onChange={(event) => setFormState((s) => ({ ...s, timezone: event.target.value.trim() }))}
                disabled={!isEditing}
                placeholder="America/New_York"
                className="w-full rounded-button border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 shadow-card transition focus-ring disabled:cursor-not-allowed disabled:bg-mist-50"
              />
              <datalist id="parish-timezone-options">
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value} label={option.label} />
                ))}
              </datalist>
              {currentParishTime ? <p className="text-xs text-ink-500">Current parish time: {currentParishTime}</p> : null}
              {nextRunPreview ? <p className="text-xs text-ink-500">Next run: {nextRunPreview} (parish time)</p> : null}
              <p className="text-xs text-ink-500">Daylight saving is handled automatically for IANA timezones.</p>
              <div className="rounded-button border border-mist-200 bg-mist-50 px-3 py-2 text-xs text-ink-600">
                <p>
                  <span className="font-medium text-ink-800">Planned for today:</span> {emailsPlannedToday} greeting
                  {emailsPlannedToday === 1 ? "" : "s"}
                </p>
                <p>
                  <span className="font-medium text-ink-800">Confirmed sent today:</span> {emailsSentToday} greeting
                  {emailsSentToday === 1 ? "" : "s"}
                </p>
                {latestGreetingSentLabel ? (
                  <p>
                    <span className="font-medium text-ink-800">Last confirmed send:</span> {latestGreetingSentLabel} (parish
                    time)
                  </p>
                ) : null}
              </div>
              {isLegacyUtcOffsetTimezone(formState.timezone) ? (
                <p className="text-xs text-amber-700">
                  Legacy fixed UTC offset detected. Please choose an IANA timezone (for example, America/New_York) to
                  keep scheduling correct during daylight saving transitions.
                </p>
              ) : null}
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <CardHeader>
            <CardTitle>Email templates</CardTitle>
            <CardDescription>
              Optional templates with placeholders: {"{firstName}"}, {"{parishName}"}.
            </CardDescription>
          </CardHeader>

          <AvatarUploadField
            label="Parish logo"
            currentUrl={logoUrl}
            fallbackText={parishName}
            uploadEndpoint={`/api/parishes/${parishId}/logo`}
            deleteEndpoint={`/api/parishes/${parishId}/logo`}
            disabled={!isEditing}
          />

          <label className="block space-y-1 text-sm text-ink-700">
            <span className="font-medium">Birthday template (safe HTML)</span>
            <textarea
              value={formState.birthdayTemplate}
              onChange={(event) => setFormState((s) => ({ ...s, birthdayTemplate: event.target.value }))}
              rows={5}
              disabled={!isEditing}
              className="w-full rounded-card border border-mist-200 bg-white px-3 py-2 focus-ring disabled:cursor-not-allowed disabled:bg-mist-50"
              placeholder="Happy Birthday, {firstName}! Your {parishName} family is praying for you."
            />
          </label>

          <label className="block space-y-1 text-sm text-ink-700">
            <span className="font-medium">Anniversary template (safe HTML)</span>
            <textarea
              value={formState.anniversaryTemplate}
              onChange={(event) => setFormState((s) => ({ ...s, anniversaryTemplate: event.target.value }))}
              rows={5}
              disabled={!isEditing}
              className="w-full rounded-card border border-mist-200 bg-white px-3 py-2 focus-ring disabled:cursor-not-allowed disabled:bg-mist-50"
              placeholder="Happy Anniversary, {firstName}! {parishName} celebrates with you."
            />
          </label>
        </div>
      </Card>

      {isEditing ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSave} isLoading={isPending}>
            Save changes
          </Button>
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
        </div>
      ) : null}

      <Card>
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-900">Parishioner consent</p>
          <p className="text-sm text-ink-500">
            Each parishioner controls whether they receive greeting emails from their profile. Manage your own
            preferences or view onboarding status on{" "}
            <a href="/profile#important-dates" className="font-medium text-primary-600 hover:underline">
              the Profile page
            </a>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
