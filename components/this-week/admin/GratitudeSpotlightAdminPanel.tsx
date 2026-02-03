"use client";

import { useMemo, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  createHeroNomination,
  deleteHeroNomination,
  publishHeroNomination,
  unpublishHeroNomination,
  updateHeroNominationReason
} from "@/server/actions/gratitude";
import { cn } from "@/lib/ui/cn";

type GratitudeSpotlightAdminPanelProps = {
  weekId: string;
  settings: {
    enabled: boolean;
    limit: number;
  };
  compact?: boolean;
  withCard?: boolean;
  showHeader?: boolean;
  nominations: Array<{
    id: string;
    reason: string;
    status: "DRAFT" | "PUBLISHED";
    nominee: { id: string; name: string };
  }>;
  memberOptions: Array<{ id: string; name: string; label?: string }>;
};

export default function GratitudeSpotlightAdminPanel({
  weekId,
  settings,
  nominations,
  memberOptions,
  compact = false,
  withCard = true,
  showHeader = true
}: GratitudeSpotlightAdminPanelProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nomineeId, setNomineeId] = useState(memberOptions[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingNomination = useMemo(
    () => nominations.find((nomination) => nomination.id === editingId) ?? null,
    [editingId, nominations]
  );

  const resetForm = () => {
    setNomineeId(memberOptions[0]?.id ?? "");
    setReason("");
    setEditingId(null);
  };

  const submitNomination = () => {
    if (!nomineeId) {
      setErrorMessage("Select a nominee.");
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (editingId) {
          await updateHeroNominationReason({ nominationId: editingId, reason });
          addToast({ title: "Nomination updated", status: "success" });
        } else {
          await createHeroNomination({ weekId, nomineeUserId: nomineeId, reason });
          addToast({ title: "Nomination saved", status: "success" });
        }
        resetForm();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to save nomination.");
      }
    });
  };

  const handleEdit = (nominationId: string) => {
    const nomination = nominations.find((entry) => entry.id === nominationId);
    if (!nomination) {
      return;
    }
    setNomineeId(nomination.nominee.id);
    setReason(nomination.reason);
    setEditingId(nomination.id);
  };

  const handlePublish = (nominationId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await publishHeroNomination({ nominationId });
        addToast({ title: "Spotlight published", status: "success" });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to publish nomination.");
      }
    });
  };

  const handleUnpublish = (nominationId: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await unpublishHeroNomination({ nominationId });
        addToast({ title: "Spotlight unpublished", status: "success" });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to update nomination.");
      }
    });
  };

  const handleDelete = (nominationId: string) => {
    if (!window.confirm("Delete this nomination?")) {
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await deleteHeroNomination({ nominationId });
        addToast({ title: "Nomination deleted", status: "success" });
        if (editingId === nominationId) {
          resetForm();
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to delete nomination.");
      }
    });
  };

  const Wrapper = withCard ? Card : "div";

  return (
    <Wrapper className={cn("space-y-4", compact && "space-y-3")}>
      {showHeader ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink-900">Gratitude Spotlight (Admin)</p>
          <p className="text-xs text-ink-500">
            {compact
              ? "Nominate parishioners and publish highlights."
              : "Nominate parishioners and publish highlights for the week."}
          </p>
        </div>
      ) : null}

      {!settings.enabled ? (
        <div className="rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Spotlight is currently disabled for the parish.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div
        className={cn(
          "space-y-2 rounded-card border border-mist-200 bg-mist-50/60 p-3",
          compact && "space-y-1 p-2"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase text-ink-500">
            {editingNomination
              ? `Editing ${editingNomination.nominee.name}`
              : `New nomination · limit ${settings.limit}`}
          </p>
          {editingNomination ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={resetForm}
              isLoading={isPending}
            >
              Cancel
            </Button>
          ) : null}
        </div>
        <label className="space-y-1 text-xs font-medium text-ink-700">
          Nominee
          <select
            value={nomineeId}
            onChange={(event) => setNomineeId(event.target.value)}
            disabled={Boolean(editingNomination)}
            className="mt-1 w-full rounded-button border border-mist-200 bg-white px-3 py-2 text-xs text-ink-700 shadow-card focus-ring"
          >
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label ?? member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-ink-700">
          Reason
          <Textarea
            rows={compact ? 2 : 3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Share a short note of gratitude."
          />
        </label>
        <Button type="button" size="sm" onClick={submitNomination} isLoading={isPending}>
          {editingNomination ? "Update nomination" : "Save nomination"}
        </Button>
      </div>

      {nominations.length ? (
        <ul className={cn("space-y-3", compact && "space-y-2")}>
          {nominations.map((nomination) => (
            <li
              key={nomination.id}
              className={cn(
                "rounded-card border border-mist-200 bg-white p-3 text-xs text-ink-600",
                compact && "p-2"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-ink-800">
                  {nomination.nominee.name}
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    nomination.status === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-mist-100 text-ink-500"
                  )}
                >
                  {nomination.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </div>
              <p
                className={cn(
                  "mt-2 rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-600",
                  compact && "mt-1 px-2 py-1.5"
                )}
              >
                {nomination.reason}
              </p>
              <div className={cn("mt-2 flex flex-wrap gap-2", compact && "mt-1")}>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(nomination.id)}
                  isLoading={isPending}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(nomination.id)}
                  isLoading={isPending}
                >
                  Delete
                </Button>
                {nomination.status === "PUBLISHED" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnpublish(nomination.id)}
                    isLoading={isPending}
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handlePublish(nomination.id)}
                    isLoading={isPending}
                    disabled={!settings.enabled}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn(
            "rounded-card border border-mist-100 bg-mist-50 px-3 py-2 text-xs text-ink-500",
            compact && "px-2 py-1.5"
          )}
        >
          No nominations yet for this week.
        </p>
      )}
    </Wrapper>
  );
}
