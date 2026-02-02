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

type OpportunityRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = "form" | "success";

export default function OpportunityRequestDialog({
  open,
  onOpenChange
}: OpportunityRequestDialogProps) {
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
              Thank you! Your opportunity request has been submitted to parish leadership.
              We'll review it and create the opportunity if it aligns with our parish needs.
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
          Have an idea for a volunteer opportunity? Share it with parish leadership
          and help build our community of service.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-title`}>Opportunity title</Label>
          <Input
            id={`${formId}-title`}
            name="title"
            required
            placeholder="e.g., Help with choir practice"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-type`}>Category</Label>
          <Select id={`${formId}-type`} name="type" required>
            <option value="">Select a category</option>
            <option value="SERVICE">Service</option>
            <option value="COMMUNITY">Community</option>
            <option value="LEARNING">Learning</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-description`}>Description</Label>
          <Textarea
            id={`${formId}-description`}
            name="description"
            required
            placeholder="Tell us why this opportunity is needed and what it involves"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-timeCommitment`}>Time commitment</Label>
          <Select id={`${formId}-timeCommitment`} name="timeCommitment">
            <option value="">Select time commitment</option>
            <option value="flexible">Flexible</option>
            <option value="1-2">1-2 hours</option>
            <option value="2-3">2-3 hours</option>
            <option value="4+">4+ hours</option>
          </Select>
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

        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-notes`}>Additional notes (optional)</Label>
          <Textarea
            id={`${formId}-notes`}
            name="notes"
            placeholder="Any other details that might be helpful"
            className="min-h-[80px]"
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

  const title = formState === "success" ? "Request submitted" : "Request an opportunity";

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
