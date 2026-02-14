"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type AvatarUploadFieldProps = {
  label: string;
  currentUrl: string | null;
  fallbackText: string;
  uploadEndpoint: string;
  deleteEndpoint: string;
  onUpdated?: (nextUrl: string | null) => void;
};

export default function AvatarUploadField({
  label,
  currentUrl,
  fallbackText,
  uploadEndpoint,
  deleteEndpoint,
  onUpdated
}: AvatarUploadFieldProps) {
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [isBusy, setIsBusy] = useState(false);

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsBusy(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Unable to upload image");
      }

      const payload = await response.json();
      const nextUrl = payload.avatarUrl as string;
      setPreviewUrl(nextUrl);
      onUpdated?.(nextUrl);
      addToast({ title: "Image uploaded", status: "success" });
    } catch (error) {
      addToast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        status: "error"
      });
    } finally {
      setIsBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);

    try {
      const response = await fetch(deleteEndpoint, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Unable to remove image");
      }
      setPreviewUrl(null);
      onUpdated?.(null);
      addToast({ title: "Image removed", status: "success" });
    } catch (error) {
      addToast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Please try again.",
        status: "error"
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-mist-200 bg-mist-50/60 p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          fallbackText.slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{label}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void handleFileChange(event.currentTarget.files?.[0] ?? null)}
          />
          <Button type="button" size="sm" variant="secondary" isLoading={isBusy} onClick={() => inputRef.current?.click()}>
            Upload photo
          </Button>
          {previewUrl ? (
            <Button type="button" size="sm" variant="ghost" isLoading={isBusy} onClick={() => void handleRemove()}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
