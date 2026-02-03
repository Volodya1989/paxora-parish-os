"use client";

import { useState, useId } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { CheckCircleIcon } from "@/components/icons/ParishIcons";

type EventRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = "form" | "success";

export default function EventRequestDialog({
  open,
  onOpenChange
}: EventRequestDialogProps) {
  const modalId = useId();
  const drawerId = useId();
  const [formState, setFormState] = useState<FormState>("form");

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setFormState("form"), 300);
  };

  const renderContent = (formId: string) => {
    if (formState === "success") {
      return (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircleIcon className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-ink-900">Request submitted</h3>
            <p className="max-w-sm text-sm leading-relaxed text-ink-500">
              Thank you! Your event request has been submitted to parish leadership.
              We&apos;ll review it and add it to the calendar if it fits our schedule.
            </p>
          </div>
          <Button onClick={handleClose} className="mt-2">
            Done
          </Button>
        </div>
      );
    }

    return (
      <form
        key={formId}
        onSubmit={(e) => {
          e.preventDefault();
          setFormState("success");
        }}
        className="space-y-4"
      >
        <p className="text-sm text-ink-500">
          Know of an event that should be on the parish calendar? Submit a request
          and parish leadership will review it.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-title`}>Event title</Label>
          <Input
            id={`${formId}-title`}
            name="title"
            required
            placeholder="e.g., Youth group outing"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-type`}>Event type</Label>
          <Select id={`${formId}-type`} name="type" required>
            <option value="">Select a type</option>
            <option value="SERVICE">Service</option>
            <option value="REHEARSAL">Rehearsal</option>
            <option value="GATHERING">Community gathering</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-date`}>Proposed date</Label>
            <Input
              id={`${formId}-date`}
              name="date"
              type="date"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-time`}>Proposed time</Label>
            <Input
              id={`${formId}-time`}
              name="time"
              type="time"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-location`}>Location</Label>
          <Input
            id={`${formId}-location`}
            name="location"
            required
            placeholder="Where will this event take place?"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-description`}>Description</Label>
          <Textarea
            id={`${formId}-description`}
            name="description"
            required
            placeholder="Tell us about the event and why it should be scheduled"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-participants`}>Expected participants (optional)</Label>
          <Input
            id={`${formId}-participants`}
            name="participants"
            type="number"
            min="1"
            placeholder="Approximate number"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-name`}>Your name</Label>
          <Input
            id={`${formId}-name`}
            name="contactName"
            required
            placeholder="So leadership can follow up"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-email`}>Email</Label>
          <Input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            placeholder="your@email.com"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">
            Submit request
          </Button>
        </div>
      </form>
    );
  };

  const title = formState === "success" ? "Request submitted" : "Request an event";

  return (
    <>
      <Modal open={open} onClose={handleClose} title={title}>
        {renderContent(modalId)}
      </Modal>
      <Drawer open={open} onClose={handleClose} title={title}>
        {renderContent(drawerId)}
      </Drawer>
    </>
  );
}
