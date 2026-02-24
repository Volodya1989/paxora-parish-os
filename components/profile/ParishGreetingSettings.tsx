"use client";

import { useState, useTransition } from "react";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import AvatarUploadField from "@/components/shared/AvatarUploadField";
import { useToast } from "@/components/ui/Toast";
import { updateParishGreetingTemplates } from "@/app/actions/parishGreetings";

type ParishGreetingSettingsProps = {
  parishId: string;
  parishName: string;
  logoUrl: string | null;
  birthdayGreetingTemplate: string | null;
  anniversaryGreetingTemplate: string | null;
  greetingsSendHourLocal: number;
};

export default function ParishGreetingSettings({
  parishId,
  parishName,
  logoUrl,
  birthdayGreetingTemplate,
  anniversaryGreetingTemplate,
  greetingsSendHourLocal
}: ParishGreetingSettingsProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [savedBirthdayTemplate, setSavedBirthdayTemplate] = useState(birthdayGreetingTemplate ?? "");
  const [savedAnniversaryTemplate, setSavedAnniversaryTemplate] = useState(anniversaryGreetingTemplate ?? "");
  const [birthdayTemplate, setBirthdayTemplate] = useState(savedBirthdayTemplate);
  const [anniversaryTemplate, setAnniversaryTemplate] = useState(savedAnniversaryTemplate);
  const [savedSendHourLocal, setSavedSendHourLocal] = useState(greetingsSendHourLocal);
  const [sendHourLocal, setSendHourLocal] = useState(greetingsSendHourLocal);

  return (
    <Card>
      <div className="space-y-4">
        <CardHeader>
          <CardTitle>Greeting email templates</CardTitle>
          <CardDescription>
            Optional templates with placeholders: {"{firstName}"}, {"{parishName}"}.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
              disabled={isEditing}
            >
              Edit templates
            </Button>
            {!isEditing ? <span className="text-xs text-ink-400">Saved templates are read-only.</span> : null}
          </div>
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
            value={birthdayTemplate}
            onChange={(event) => setBirthdayTemplate(event.target.value)}
            rows={5}
            disabled={!isEditing}
            className="w-full rounded-card border border-mist-200 bg-white px-3 py-2 focus-ring disabled:cursor-not-allowed disabled:bg-mist-50"
            placeholder="Happy Birthday, {firstName}! Your {parishName} family is praying for you."
          />
        </label>

        <label className="block space-y-1 text-sm text-ink-700">
          <span className="font-medium">Anniversary template (safe HTML)</span>
          <textarea
            value={anniversaryTemplate}
            onChange={(event) => setAnniversaryTemplate(event.target.value)}
            rows={5}
            disabled={!isEditing}
            className="w-full rounded-card border border-mist-200 bg-white px-3 py-2 focus-ring disabled:cursor-not-allowed disabled:bg-mist-50"
            placeholder="Happy Anniversary, {firstName}! {parishName} celebrates with you."
          />
        </label>



        <label className="block space-y-1 text-sm text-ink-700">
          <span className="font-medium">Send greeting emails at local hour</span>
          <select
            value={String(sendHourLocal)}
            disabled={!isEditing}
            onChange={(event) => setSendHourLocal(Number(event.target.value))}
            className="w-full rounded-card border border-mist-200 bg-white px-3 py-2 focus-ring disabled:cursor-not-allowed disabled:bg-mist-50"
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-500">Based on each parish timezone.</p>
        </label>

        {isEditing ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              isLoading={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await updateParishGreetingTemplates({
                      birthdayGreetingTemplate: birthdayTemplate,
                      anniversaryGreetingTemplate: anniversaryTemplate,
                      greetingsSendHourLocal: sendHourLocal
                    });
                    setSavedBirthdayTemplate(birthdayTemplate);
                    setSavedAnniversaryTemplate(anniversaryTemplate);
                    setSavedSendHourLocal(sendHourLocal);
                    setIsEditing(false);
                    addToast({ title: "Templates saved", status: "success" });
                  } catch (error) {
                    addToast({
                      title: "Unable to save templates",
                      description: error instanceof Error ? error.message : "Please try again.",
                      status: "error"
                    });
                  }
                })
              }
            >
              Save changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setBirthdayTemplate(savedBirthdayTemplate);
                setAnniversaryTemplate(savedAnniversaryTemplate);
                setSendHourLocal(savedSendHourLocal);
                setIsEditing(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
