"use client";

import { useMemo, useState, useTransition } from "react";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SelectMenu from "@/components/ui/SelectMenu";
import { useToast } from "@/components/ui/Toast";
import {
  markGreetingsPromptDoNotAskAgain,
  markGreetingsPromptNotNow,
  updateAllowParishGreetings,
  updateProfileDates
} from "@/app/actions/profile";
import { cn } from "@/lib/ui/cn";
import { getMaxDayForMonth, monthOptions } from "@/lib/profile/dates";
import { hasAnyImportantDate, shouldShowGreetingsPrompt } from "@/lib/profile/greetingsPrompt";

type ProfileDatesProps = {
  initialDates: {
    birthdayMonth: number | null;
    birthdayDay: number | null;
    anniversaryMonth: number | null;
    anniversaryDay: number | null;
    greetingsOptIn: boolean;
    greetingsLastPromptedAt: Date | null;
    greetingsDoNotAskAgain: boolean;
  };
};

type ProfileDateErrors = Partial<
  Record<
    "birthdayMonth" | "birthdayDay" | "anniversaryMonth" | "anniversaryDay" | "greetingsOptIn",
    string
  >
>;

const buildDayOptions = (month: number | null) => {
  if (!month) return [];
  const maxDay = getMaxDayForMonth(month);
  return Array.from({ length: maxDay }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1)
  }));
};

export default function ProfileDates({ initialDates }: ProfileDatesProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [showAnniversaryFields, setShowAnniversaryFields] = useState(
    Boolean(initialDates.anniversaryMonth || initialDates.anniversaryDay)
  );
  const [savedState, setSavedState] = useState({
    birthdayMonth: initialDates.birthdayMonth ? String(initialDates.birthdayMonth) : "",
    birthdayDay: initialDates.birthdayDay ? String(initialDates.birthdayDay) : "",
    anniversaryMonth: initialDates.anniversaryMonth ? String(initialDates.anniversaryMonth) : "",
    anniversaryDay: initialDates.anniversaryDay ? String(initialDates.anniversaryDay) : "",
    greetingsOptIn: initialDates.greetingsOptIn
  });
  const [formState, setFormState] = useState(savedState);
  const [errors, setErrors] = useState<ProfileDateErrors>({});
  const [promptLastPromptedAt, setPromptLastPromptedAt] = useState(initialDates.greetingsLastPromptedAt);
  const [promptDoNotAskAgain, setPromptDoNotAskAgain] = useState(initialDates.greetingsDoNotAskAgain);

  const birthdayMonthValue = formState.birthdayMonth ? Number(formState.birthdayMonth) : null;
  const anniversaryMonthValue = formState.anniversaryMonth ? Number(formState.anniversaryMonth) : null;

  const birthdayDayOptions = useMemo(() => buildDayOptions(birthdayMonthValue), [birthdayMonthValue]);
  const anniversaryDayOptions = useMemo(() => buildDayOptions(anniversaryMonthValue), [anniversaryMonthValue]);

  const monthSelectOptions = useMemo(
    () =>
      monthOptions.map((option) => ({
        value: String(option.value),
        label: option.label
      })),
    []
  );

  const anyDateSaved = hasAnyImportantDate({
    birthdayMonth: formState.birthdayMonth ? Number(formState.birthdayMonth) : null,
    birthdayDay: formState.birthdayDay ? Number(formState.birthdayDay) : null,
    anniversaryMonth: formState.anniversaryMonth ? Number(formState.anniversaryMonth) : null,
    anniversaryDay: formState.anniversaryDay ? Number(formState.anniversaryDay) : null
  });

  const showGentlePrompt = shouldShowGreetingsPrompt({
    hasAnyImportantDate: anyDateSaved,
    greetingsDoNotAskAgain: promptDoNotAskAgain,
    greetingsLastPromptedAt: promptLastPromptedAt
  });

  const showConsentFollowUp = anyDateSaved && !formState.greetingsOptIn;

  const updateMonth = (field: "birthdayMonth" | "anniversaryMonth", value: string) => {
    const nextMonth = value ? Number(value) : null;
    const dayField = field === "birthdayMonth" ? "birthdayDay" : "anniversaryDay";
    setFormState((current) => {
      let nextDay = current[dayField];
      if (!nextMonth) {
        nextDay = "";
      } else if (nextDay) {
        const maxDay = getMaxDayForMonth(nextMonth);
        if (Number(nextDay) > maxDay) {
          nextDay = "";
        }
      }
      return { ...current, [field]: value, [dayField]: nextDay };
    });
    setErrors((current) => ({ ...current, [field]: undefined, [dayField]: undefined }));
  };

  const updateDay = (field: "birthdayDay" | "anniversaryDay", value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateProfileDates({
          birthdayMonth: formState.birthdayMonth ? Number(formState.birthdayMonth) : null,
          birthdayDay: formState.birthdayDay ? Number(formState.birthdayDay) : null,
          anniversaryMonth: formState.anniversaryMonth ? Number(formState.anniversaryMonth) : null,
          anniversaryDay: formState.anniversaryDay ? Number(formState.anniversaryDay) : null,
          greetingsOptIn: formState.greetingsOptIn
        });

        if (result.status === "error") {
          setErrors(result.fieldErrors ?? {});
          addToast({ title: result.message, status: "error" });
          return;
        }

        setErrors({});
        const nextState = {
          birthdayMonth: result.data.birthdayMonth ? String(result.data.birthdayMonth) : "",
          birthdayDay: result.data.birthdayDay ? String(result.data.birthdayDay) : "",
          anniversaryMonth: result.data.anniversaryMonth ? String(result.data.anniversaryMonth) : "",
          anniversaryDay: result.data.anniversaryDay ? String(result.data.anniversaryDay) : "",
          greetingsOptIn: result.data.greetingsOptIn
        };
        setSavedState(nextState);
        setFormState(nextState);
        setIsEditing(false);
        setPromptLastPromptedAt(new Date());
        addToast({
          title: "Profile updated",
          description: "Your important dates were saved.",
          status: "success"
        });
      } catch (error) {
        addToast({
          title: "Unable to save profile",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  return (
    <Card>
      <div className="space-y-6">
        <CardHeader>
          <CardTitle>Important dates</CardTitle>
          <CardDescription>
            Birthdays are optional and help your parish celebrate with you.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setIsEditing(true)} disabled={isEditing}>
              Edit dates
            </Button>
            {!isEditing ? <span className="text-xs text-ink-400">Saved profiles are read-only.</span> : null}
          </div>
        </CardHeader>

        {showGentlePrompt ? (
          <div className="rounded-card border border-primary-200 bg-primary-50/70 p-4">
            <p className="text-sm font-medium text-ink-900">Optional: Add your birthday to receive parish greetings.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => setIsEditing(true)}>
                Add dates
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  startTransition(async () => {
                    await markGreetingsPromptNotNow();
                    setPromptLastPromptedAt(new Date());
                  })
                }
              >
                Not now
              </Button>
              <button
                type="button"
                className="text-xs font-medium text-ink-500 underline-offset-2 hover:text-ink-700 hover:underline"
                onClick={() =>
                  startTransition(async () => {
                    await markGreetingsPromptDoNotAskAgain();
                    setPromptDoNotAskAgain(true);
                  })
                }
              >
                Don&apos;t ask again
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-700">Birthday</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <SelectMenu
                  value={formState.birthdayMonth}
                  placeholder="Not set"
                  options={monthSelectOptions}
                  disabled={!isEditing}
                  onValueChange={(value) => updateMonth("birthdayMonth", value)}
                />
                {errors.birthdayMonth ? <p role="alert" className="text-xs text-rose-600">{errors.birthdayMonth}</p> : null}
              </div>
              <div className="space-y-1">
                <SelectMenu
                  value={formState.birthdayDay}
                  placeholder="Not set"
                  options={birthdayDayOptions}
                  disabled={!isEditing || !formState.birthdayMonth}
                  onValueChange={(value) => updateDay("birthdayDay", value)}
                />
                {errors.birthdayDay ? <p role="alert" className="text-xs text-rose-600">{errors.birthdayDay}</p> : null}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-700">Marriage anniversary</p>
              {!showAnniversaryFields ? (
                <button
                  type="button"
                  className="text-xs font-medium text-ink-500 underline-offset-2 hover:text-ink-700 hover:underline"
                  onClick={() => setShowAnniversaryFields(true)}
                  disabled={!isEditing}
                >
                  Add anniversary (optional)
                </button>
              ) : null}
            </div>
            {showAnniversaryFields ? (
              <>
                <p className="text-xs text-ink-500">Optional</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <SelectMenu
                      value={formState.anniversaryMonth}
                      placeholder="Not set"
                      options={monthSelectOptions}
                      disabled={!isEditing}
                      onValueChange={(value) => updateMonth("anniversaryMonth", value)}
                    />
                    {errors.anniversaryMonth ? <p role="alert" className="text-xs text-rose-600">{errors.anniversaryMonth}</p> : null}
                  </div>
                  <div className="space-y-1">
                    <SelectMenu
                      value={formState.anniversaryDay}
                      placeholder="Not set"
                      options={anniversaryDayOptions}
                      disabled={!isEditing || !formState.anniversaryMonth}
                      onValueChange={(value) => updateDay("anniversaryDay", value)}
                    />
                    {errors.anniversaryDay ? <p role="alert" className="text-xs text-rose-600">{errors.anniversaryDay}</p> : null}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-500">Optional.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900">Allow parish greetings</p>
            <p className="text-sm text-ink-500">You can change this anytime.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={formState.greetingsOptIn}
            aria-label="Allow parish greetings"
            onClick={() =>
              setFormState((current) =>
                isEditing ? { ...current, greetingsOptIn: !current.greetingsOptIn } : current
              )
            }
            disabled={isPending || !isEditing}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center self-start rounded-full border transition focus-ring sm:self-center",
              formState.greetingsOptIn ? "border-primary-500 bg-primary-500" : "border-mist-200 bg-mist-200",
              isPending ? "opacity-60" : "hover:border-primary-400"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition",
                formState.greetingsOptIn ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {showConsentFollowUp ? (
          <div className="rounded-card border border-mist-200 bg-white p-4">
            <p className="text-sm font-medium text-ink-900">Would you like to receive email greetings around your important dates?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    await updateAllowParishGreetings(true);
                    setFormState((current) => ({ ...current, greetingsOptIn: true }));
                    setSavedState((current) => ({ ...current, greetingsOptIn: true }));
                    addToast({ title: "Greetings enabled", status: "success" });
                  })
                }
              >
                Enable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  startTransition(async () => {
                    await markGreetingsPromptNotNow();
                    setPromptLastPromptedAt(new Date());
                  })
                }
              >
                Not now
              </Button>
            </div>
          </div>
        ) : null}

        {isEditing ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleSave} isLoading={isPending}>
              Save changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFormState(savedState);
                setErrors({});
                setIsEditing(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : null}
        <p className="text-xs text-ink-400">Dates are stored without a year and can be updated anytime.</p>
      </div>
    </Card>
  );
}
