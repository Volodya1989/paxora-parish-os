"use client";

import { useOptimistic, useState, useTransition } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DigestActions from "@/components/shared/DigestActions";
import { generateDigestPreview, publishDigest, saveDigestDraft } from "@/server/actions/digest";

type DigestStatus = "none" | "draft" | "published";

type DigestComposerProps = {
  initialContent: string;
  initialStatus: DigestStatus;
};

const statusTone: Record<DigestStatus, "neutral" | "draft" | "published"> = {
  none: "neutral",
  draft: "draft",
  published: "published"
};

export default function DigestComposer({ initialContent, initialStatus }: DigestComposerProps) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<DigestStatus>(initialStatus);
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<DigestStatus, DigestStatus>(
    status,
    (_state, next) => next
  );
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [isGenerating, startGenerating] = useTransition();

  const statusLabel =
    optimisticStatus === "none" ? "No digest" : optimisticStatus === "published" ? "Published" : "Draft";

  const handleSave = () => {
    startSaving(async () => {
      setOptimisticStatus("draft");
      const result = await saveDigestDraft(content);
      setStatus(result.status);
      setContent(result.content);
    });
  };

  const handlePublish = () => {
    startPublishing(async () => {
      setOptimisticStatus("published");
      const result = await publishDigest(content);
      setStatus(result.status);
      setContent(result.content);
    });
  };

  const handleGenerate = () => {
    startGenerating(async () => {
      const result = await generateDigestPreview();
      setContent(result.content);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Digest editor</h2>
            <p className="text-sm text-ink-500">Draft updates for this week.</p>
          </div>
          <Badge tone={statusTone[optimisticStatus]}>{statusLabel}</Badge>
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium text-ink-700" htmlFor="digest-content">
            Content
          </label>
          <textarea
            id="digest-content"
            name="content"
            className="mt-2 min-h-[240px] w-full rounded-md border border-mist-200 px-3 py-2 text-sm text-ink-900 shadow-sm focus:border-ink-900 focus:outline-none"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <DigestActions
            onSave={handleSave}
            onPublish={handlePublish}
            isSaving={isSaving}
            isPublishing={isPublishing}
            disablePublish={optimisticStatus === "published" || content.trim().length === 0}
            disableSave={content.trim().length === 0}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="text-sm font-medium text-ink-600 underline disabled:text-ink-400"
          >
            {isGenerating ? "Generating..." : "Generate preview"}
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Preview</h2>
          <p className="text-xs uppercase tracking-wide text-ink-400">Live</p>
        </div>
        <div className="mt-4 rounded-md border border-dashed border-mist-200 bg-mist-50 p-4">
          {content.trim().length === 0 ? (
            <p className="text-sm text-ink-500">Generate a preview or start writing to see the digest.</p>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-ink-700">{content}</pre>
          )}
        </div>
      </Card>
    </div>
  );
}
