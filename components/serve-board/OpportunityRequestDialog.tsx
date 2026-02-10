"use client";

import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import RequestDialog from "@/components/shared/RequestDialog";
import { useTranslations } from "@/lib/i18n/provider";

type OpportunityRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function OpportunityRequestDialog({
  open,
  onOpenChange
}: OpportunityRequestDialogProps) {
  const t = useTranslations();

  return (
    <RequestDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("serve.requestOpportunity")}
      description={t("serve.requestOpportunityDesc")}
      successMessage={t("serve.requestOpportunitySuccess")}
      renderFields={(formId) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-title`}>{t("serve.requestForm.title")}</Label>
            <Input
              id={`${formId}-title`}
              name="title"
              required
              placeholder={t("serve.requestForm.titlePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-type`}>{t("serve.requestForm.category")}</Label>
            <Select id={`${formId}-type`} name="type" required>
              <option value="">{t("serve.requestForm.selectCategory")}</option>
              <option value="SERVICE">{t("serve.requestForm.categoryService")}</option>
              <option value="COMMUNITY">{t("serve.requestForm.categoryCommunity")}</option>
              <option value="LEARNING">{t("serve.requestForm.categoryLearning")}</option>
              <option value="OTHER">{t("serve.requestForm.categoryOther")}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-description`}>{t("serve.requestForm.description")}</Label>
            <Textarea
              id={`${formId}-description`}
              name="description"
              required
              placeholder={t("serve.requestForm.descriptionPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-timeCommitment`}>{t("serve.requestForm.timeCommitment")}</Label>
            <Select id={`${formId}-timeCommitment`} name="timeCommitment">
              <option value="">{t("serve.requestForm.selectTimeCommitment")}</option>
              <option value="flexible">{t("serve.requestForm.timeFlexible")}</option>
              <option value="1-2">{t("serve.requestForm.time1To2")}</option>
              <option value="2-3">{t("serve.requestForm.time2To3")}</option>
              <option value="4+">{t("serve.requestForm.time4Plus")}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-name`}>{t("serve.requestForm.yourName")}</Label>
            <Input
              id={`${formId}-name`}
              name="contactName"
              required
              placeholder={t("serve.requestForm.yourNamePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-email`}>{t("serve.requestForm.email")}</Label>
            <Input
              id={`${formId}-email`}
              name="email"
              type="email"
              required
              placeholder={t("serve.requestForm.emailPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-notes`}>{t("serve.requestForm.notes")}</Label>
            <Textarea
              id={`${formId}-notes`}
              name="notes"
              placeholder={t("serve.requestForm.notesPlaceholder")}
              className="min-h-[80px]"
            />
          </div>
        </>
      )}
    />
  );
}
