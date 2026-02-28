"use client";

import { useId, useState, useTransition, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import AudiencePicker from "@/components/announcements/AudiencePicker";
import type { AnnouncementDetail } from "@/lib/queries/announcements";
import {
  createAnnouncement,
  updateAnnouncement,
  getAnnouncementPeople,
  listAnnouncementScopeChannels,
  sendTestAnnouncementEmail,
  sendAnnouncementEmail
} from "@/server/actions/announcements";

const RichTextEditor = dynamic(
  () => import("@/components/announcements/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-card border border-mist-200 bg-mist-50" /> }
);

type Person = {
  userId: string;
  name: string | null;
  email: string;
};

type AnnouncementFormProps = {
  parishId: string;
  announcement?: AnnouncementDetail;
};

const TITLE_LIMIT = 120;

export default function AnnouncementForm({ parishId, announcement }: AnnouncementFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [bodyHtml, setBodyHtml] = useState(announcement?.bodyHtml ?? announcement?.body ?? "");
  const [bodyText, setBodyText] = useState(announcement?.bodyText ?? announcement?.body ?? "");
  const [publishNow, setPublishNow] = useState(
    announcement ? Boolean(announcement.publishedAt) : true
  );
  const [scopeType, setScopeType] = useState<"PARISH" | "CHAT">(announcement?.scopeType ?? "PARISH");
  const [chatChannelId, setChatChannelId] = useState<string>(announcement?.chatChannelId ?? "");
  const [audienceUserIds, setAudienceUserIds] = useState<string[]>(
    announcement?.audienceUserIds ?? []
  );
  const [scopeChannels, setScopeChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [deliverySummary, setDeliverySummary] = useState<{
    sentCount: number;
    failedCount: number;
    totalCount: number;
  } | null>(null);

  const titleId = useId();

  // Fetch people list for audience picker
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAnnouncementPeople({ parishId, chatChannelId: scopeType === "CHAT" ? chatChannelId : undefined }),
      listAnnouncementScopeChannels({ parishId })
    ])
      .then(([peopleResult, channelsResult]) => {
        if (!cancelled) {
          setPeople(peopleResult);
          setScopeChannels(channelsResult.map((item) => ({ id: item.id, name: item.name })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [parishId, scopeType, chatChannelId]);

  useEffect(() => {
    if (scopeType === "PARISH") return;
    const allowedIds = new Set(people.map((person) => person.userId));
    setAudienceUserIds((current) => current.filter((id) => allowedIds.has(id)));
  }, [scopeType, people]);

  const handleEditorChange = (html: string, text: string) => {
    setBodyHtml(html);
    setBodyText(text);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedText = bodyText.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (!trimmedText) {
      setError("Message is required.");
      return;
    }

    if (scopeType === "CHAT" && !chatChannelId) {
      setError("Please select a chat for chat-scoped announcements.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        if (announcement) {
          await updateAnnouncement({
            id: announcement.id,
            title: trimmedTitle,
            body: trimmedText,
            bodyHtml,
            bodyText: trimmedText,
            scopeType,
            chatChannelId: scopeType === "CHAT" ? chatChannelId : undefined,
            audienceUserIds,
            published: publishNow
          });
          addToast({
            title: "Announcement updated",
            description: "Your announcement is saved.",
            status: "success"
          });
        } else {
          await createAnnouncement({
            parishId,
            title: trimmedTitle,
            body: trimmedText,
            bodyHtml,
            bodyText: trimmedText,
            scopeType,
            chatChannelId: scopeType === "CHAT" ? chatChannelId : undefined,
            audienceUserIds,
            published: publishNow
          });
          addToast({
            title: publishNow ? "Announcement published" : "Draft saved",
            description: publishNow
              ? "Your announcement is live for parishioners."
              : "You can publish this announcement whenever you're ready.",
            status: "success"
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
          description: message,
          status: "error"
        });
      }
    });
  };

  const handleSendTest = async () => {
    if (!announcement) {
      addToast({
        title: "Save first",
        description: "Please save the announcement before sending a test email.",
        status: "error"
      });
      return;
    }
    setIsSendingTest(true);
    try {
      const result = await sendTestAnnouncementEmail({
        announcementId: announcement.id
      });
      addToast({
        title: "Test email sent",
        description: `A test email was sent to ${result.email}.`,
        status: "success"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test email.";
      addToast({
        title: "Test email failed",
        description: message,
        status: "error"
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendToAudience = async () => {
    if (!announcement) {
      addToast({
        title: "Save first",
        description: "Please save the announcement before sending emails.",
        status: "error"
      });
      return;
    }
    if (audienceUserIds.length === 0) {
      addToast({
        title: "No recipients",
        description: "Please select at least one recipient.",
        status: "error"
      });
      return;
    }
    setIsSending(true);
    setDeliverySummary(null);
    try {
      const result = await sendAnnouncementEmail({
        announcementId: announcement.id
      });
      setDeliverySummary(result);
      addToast({
        title: "Emails sent",
        description: `Sent ${result.sentCount} of ${result.totalCount} emails.${result.failedCount > 0 ? ` ${result.failedCount} failed.` : ""}`,
        status: result.failedCount > 0 ? "error" : "success"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send emails.";
      addToast({
        title: "Send failed",
        description: message,
        status: "error"
      });
    } finally {
      setIsSending(false);
    }
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
        <Label>Message</Label>
        <RichTextEditor
          content={bodyHtml}
          onChange={handleEditorChange}
          placeholder="Share the details parishioners need to know."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scopeType">Scope</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            id="scopeType"
            value={scopeType}
            onChange={(event) => setScopeType(event.currentTarget.value as "PARISH" | "CHAT")}
          >
            <option value="PARISH">Parish-wide</option>
            <option value="CHAT">Specific chat</option>
          </Select>
          {scopeType === "CHAT" ? (
            <Select
              value={chatChannelId}
              onChange={(event) => setChatChannelId(event.currentTarget.value)}
              required
            >
              <option value="" disabled>Select chat</option>
              {scopeChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>{channel.name}</option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Recipients</Label>
        <AudiencePicker
          people={people}
          selected={audienceUserIds}
          onChange={setAudienceUserIds}
        />
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

      {announcement ? (
        <div className="space-y-3 border-t border-mist-100 pt-4">
          <p className="text-sm font-medium text-ink-700">Email actions</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isLoading={isSendingTest}
              onClick={handleSendTest}
            >
              Send test email to me
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isSending}
              onClick={handleSendToAudience}
              disabled={audienceUserIds.length === 0}
            >
              Send to {audienceUserIds.length} recipient{audienceUserIds.length !== 1 ? "s" : ""}
            </Button>
          </div>
          {deliverySummary ? (
            <div className="rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-sm text-ink-600">
              <span className="font-medium">Delivery summary:</span>{" "}
              {deliverySummary.sentCount} sent
              {deliverySummary.failedCount > 0
                ? `, ${deliverySummary.failedCount} failed`
                : ""}
              {" "}of {deliverySummary.totalCount} total.
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
