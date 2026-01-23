"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { AnnouncementDetail } from "@/lib/queries/announcements";
import { createAnnouncement, updateAnnouncement } from "@/server/actions/announcements";

type AnnouncementFormProps = {
  parishId: string;
  announcement?: AnnouncementDetail;
};

const TITLE_LIMIT = 120;
const BODY_LIMIT = 1200;

export default function AnnouncementForm({ parishId, announcement }: AnnouncementFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [publishNow, setPublishNow] = useState(
    announcement ? Boolean(announcement.publishedAt) : true
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleInsertNumberedList = () => {
    const template = ["1. ", "2. ", "3. "].join("\n");
    setBody((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return template;
      }
      return `${trimmed}\n\n${template}`;
    });
  };

  const titleId = useId();
  const bodyId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (!trimmedBody) {
      setError("Message is required.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        if (announcement) {
          await updateAnnouncement({
            id: announcement.id,
            title: trimmedTitle,
            body: trimmedBody,
            published: publishNow
          });
          addToast({
            title: "Announcement updated",
            description: "Your announcement is saved."
          });
        } else {
          await createAnnouncement({
            parishId,
            title: trimmedTitle,
            body: trimmedBody,
            published: publishNow
          });
          addToast({
            title: publishNow ? "Announcement published" : "Draft saved",
            description: publishNow
              ? "Your announcement is live for parishioners."
              : "You can publish this announcement whenever you're ready."
          });
        }
        router.push("/announcements");
        router.refresh();
      } catch (submitError) {
        const message =
          submitError instanceof Error && submitError.message
            ? submitError.message
            : "We couldn't save that announcement. Please try again.";
        setError(message);
        addToast({
          title: "Save failed",
          description: message
        });
      }
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          name="title"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          maxLength={TITLE_LIMIT}
          placeholder="e.g. Sunday picnic on the lawn"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={bodyId}>Message</Label>
        <Textarea
          id={bodyId}
          name="body"
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          maxLength={BODY_LIMIT}
          rows={6}
          placeholder="Share the details parishioners need to know."
          required
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <span>Need a weekly list?</span>
          <Button type="button" size="sm" variant="ghost" onClick={handleInsertNumberedList}>
            Insert numbered list
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={publishNow}
          onChange={(event) => setPublishNow(event.target.checked)}
          className="h-4 w-4 rounded border-mist-200 text-primary-600 focus-ring"
        />
        Publish immediately
      </label>

      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={isPending}>
          {announcement ? "Save changes" : publishNow ? "Publish announcement" : "Save draft"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/announcements")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
