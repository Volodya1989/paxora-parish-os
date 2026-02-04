"use client";

import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import RequestDialog from "@/components/shared/RequestDialog";
import { submitEventRequest } from "@/server/actions/eventRequests";

type EventRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function EventRequestDialog({
  open,
  onOpenChange
}: EventRequestDialogProps) {
  return (
    <RequestDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request an event"
      description={
        "Know of an event that should be on the parish calendar? Submit a request and parish leadership will review it. Requests are shared with the group lead and always sent to clergy."
      }
      successMessage={
        "Thank you! Your event request has been submitted to parish leadership. We'll review it, and you'll receive an email once it's approved or declined."
      }
      onSubmit={submitEventRequest}
      renderFields={(formId) => (
        <>
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

        </>
      )}
    />
  );
}
