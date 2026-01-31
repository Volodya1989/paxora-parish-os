"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Label from "@/components/ui/Label";
import type { ParishHubIcon } from "./ParishHubTile";

const ICON_OPTIONS: Array<{ value: ParishHubIcon; label: string }> = [
  { value: "BULLETIN", label: "Bulletin" },
  { value: "MASS_TIMES", label: "Mass Times" },
  { value: "CONFESSION", label: "Confession" },
  { value: "WEBSITE", label: "Website" },
  { value: "CALENDAR", label: "Calendar" },
  { value: "READINGS", label: "Readings" },
  { value: "GIVING", label: "Giving" },
  { value: "CONTACT", label: "Contact" }
];

const VISIBILITY_OPTIONS: Array<{ value: "PUBLIC" | "LOGGED_IN"; label: string }> = [
  { value: "PUBLIC", label: "Public (anyone can see)" },
  { value: "LOGGED_IN", label: "Logged in members only" }
];

export type ParishHubItemFormData = {
  id?: string;
  label: string;
  icon: ParishHubIcon;
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl: string;
  internalRoute: string;
  visibility: "PUBLIC" | "LOGGED_IN";
  enabled: boolean;
};

type ParishHubItemFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ParishHubItemFormData) => void;
  initialData?: ParishHubItemFormData;
  isLoading?: boolean;
  mode: "create" | "edit";
};

const defaultFormData: ParishHubItemFormData = {
  label: "",
  icon: "BULLETIN",
  targetType: "EXTERNAL",
  targetUrl: "",
  internalRoute: "",
  visibility: "PUBLIC",
  enabled: true
};

export default function ParishHubItemForm({
  open,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  mode
}: ParishHubItemFormProps) {
  const [formData, setFormData] = useState<ParishHubItemFormData>(
    initialData ?? defaultFormData
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ParishHubItemFormData, string>>>({});

  useEffect(() => {
    if (open) {
      setFormData(initialData ?? defaultFormData);
      setErrors({});
    }
  }, [open, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ParishHubItemFormData, string>> = {};

    if (!formData.label.trim()) {
      newErrors.label = "Label is required";
    } else if (formData.label.trim().length > 80) {
      newErrors.label = "Label must be 80 characters or fewer";
    }

    if (formData.targetType === "EXTERNAL") {
      if (!formData.targetUrl.trim()) {
        newErrors.targetUrl = "URL is required for external links";
      } else {
        try {
          new URL(formData.targetUrl.trim());
        } catch {
          newErrors.targetUrl = "Please enter a valid URL";
        }
      }
    }

    if (formData.targetType === "INTERNAL") {
      if (!formData.internalRoute.trim()) {
        newErrors.internalRoute = "Route is required for internal links";
      } else if (!formData.internalRoute.trim().startsWith("/")) {
        newErrors.internalRoute = "Route must start with /";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="label">Label</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
          placeholder="Enter tile label"
          aria-invalid={!!errors.label}
          maxLength={80}
        />
        {errors.label && <p className="text-xs text-rose-600">{errors.label}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="icon">Icon</Label>
        <Select
          id="icon"
          value={formData.icon}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, icon: e.target.value as ParishHubIcon }))
          }
        >
          {ICON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="targetType">Link Type</Label>
        <Select
          id="targetType"
          value={formData.targetType}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              targetType: e.target.value as "EXTERNAL" | "INTERNAL"
            }))
          }
        >
          <option value="EXTERNAL">External URL</option>
          <option value="INTERNAL">Internal Route</option>
        </Select>
      </div>

      {formData.targetType === "EXTERNAL" && (
        <div className="space-y-1.5">
          <Label htmlFor="targetUrl">External URL</Label>
          <Input
            id="targetUrl"
            type="url"
            value={formData.targetUrl}
            onChange={(e) => setFormData((prev) => ({ ...prev, targetUrl: e.target.value }))}
            placeholder="https://example.com"
            aria-invalid={!!errors.targetUrl}
          />
          {errors.targetUrl && <p className="text-xs text-rose-600">{errors.targetUrl}</p>}
        </div>
      )}

      {formData.targetType === "INTERNAL" && (
        <div className="space-y-1.5">
          <Label htmlFor="internalRoute">Internal Route</Label>
          <Input
            id="internalRoute"
            value={formData.internalRoute}
            onChange={(e) => setFormData((prev) => ({ ...prev, internalRoute: e.target.value }))}
            placeholder="/calendar"
            aria-invalid={!!errors.internalRoute}
          />
          {errors.internalRoute && (
            <p className="text-xs text-rose-600">{errors.internalRoute}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="visibility">Visibility</Label>
        <Select
          id="visibility"
          value={formData.visibility}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              visibility: e.target.value as "PUBLIC" | "LOGGED_IN"
            }))
          }
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-card border border-mist-200 bg-mist-50/60 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-ink-700">Enabled</p>
          <p className="text-xs text-ink-500">Show this tile in the hub grid</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={formData.enabled}
          onClick={() => setFormData((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition focus-ring ${
            formData.enabled
              ? "border-primary-500 bg-primary-500"
              : "border-mist-200 bg-mist-200"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition ${
              formData.enabled ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );

  const formFooter = (
    <>
      <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button type="button" onClick={handleSubmit} isLoading={isLoading}>
        {mode === "create" ? "Add Tile" : "Save Changes"}
      </Button>
    </>
  );

  const title = mode === "create" ? "Add Hub Tile" : "Edit Hub Tile";

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} footer={formFooter}>
        {formContent}
      </Modal>
      <Drawer open={open} onClose={onClose} title={title} footer={formFooter}>
        {formContent}
      </Drawer>
    </>
  );
}
