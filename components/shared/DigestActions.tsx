"use client";

import Button from "@/components/ui/Button";

type DigestActionsProps = {
  onSave: () => void;
  onPublish: () => void;
  isSaving: boolean;
  isPublishing: boolean;
  disableSave?: boolean;
  disablePublish?: boolean;
};

export default function DigestActions({
  onSave,
  onPublish,
  isSaving,
  isPublishing,
  disableSave = false,
  disablePublish = false
}: DigestActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={onSave} disabled={isSaving || disableSave}>
        {isSaving ? "Saving..." : "Save draft"}
      </Button>
      <Button type="button" onClick={onPublish} disabled={isPublishing || disablePublish}>
        {isPublishing ? "Publishing..." : "Publish"}
      </Button>
    </div>
  );
}
