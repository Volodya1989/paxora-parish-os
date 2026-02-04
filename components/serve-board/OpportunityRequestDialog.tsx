"use client";

import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import RequestDialog from "@/components/shared/RequestDialog";

type OpportunityRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function OpportunityRequestDialog({
  open,
  onOpenChange
}: OpportunityRequestDialogProps) {
  return (
    <RequestDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request an opportunity"
      description={
        "Have an idea for a volunteer opportunity? Share it with parish leadership and help build our community of service."
      }
      successMessage={
        "Thank you! Your opportunity request has been submitted to parish leadership. We'll review it and create the opportunity if it aligns with our parish needs."
      }
      renderFields={(formId) => (
        <>
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
        </>
      )}
    />
  );
}
