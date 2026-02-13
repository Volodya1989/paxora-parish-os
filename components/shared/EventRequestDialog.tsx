"use client";

import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import RequestDialog from "@/components/shared/RequestDialog";
import { submitEventRequest } from "@/server/actions/eventRequests";
import { useTranslations } from "@/lib/i18n/provider";

type EventRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function EventRequestDialog({
  open,
  onOpenChange
}: EventRequestDialogProps) {
  const t = useTranslations();

  return (
    <RequestDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("requests.event.title")}
      description={t("requests.event.description")}
      successTitle={t("requests.common.successTitle")}
      successMessage={t("requests.event.successMessage")}
      submitLabel={t("requests.common.sendRequest")}
      doneLabel={t("requests.common.done")}
      cancelLabel={t("buttons.cancel")}
      onSubmit={submitEventRequest}
      renderFields={(formId) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-title`}>{t("requests.event.fields.eventTitle")}</Label>
            <Input
              id={`${formId}-title`}
              name="title"
              required
              placeholder={t("requests.event.fields.eventTitlePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-type`}>{t("requests.event.fields.eventType")}</Label>
            <Select id={`${formId}-type`} name="type" required>
              <option value="">{t("requests.event.fields.selectType")}</option>
              <option value="SERVICE">{t("requests.event.fields.typeService")}</option>
              <option value="REHEARSAL">{t("requests.event.fields.typeRehearsal")}</option>
              <option value="GATHERING">{t("requests.event.fields.typeGathering")}</option>
              <option value="OTHER">{t("requests.event.fields.typeOther")}</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-date`}>{t("requests.event.fields.proposedDate")}</Label>
              <Input
                id={`${formId}-date`}
                name="date"
                type="date"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-time`}>{t("requests.event.fields.proposedTime")}</Label>
              <Input
                id={`${formId}-time`}
                name="time"
                type="time"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-location`}>{t("requests.event.fields.location")}</Label>
            <Input
              id={`${formId}-location`}
              name="location"
              required
              placeholder={t("requests.event.fields.locationPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-description`}>{t("requests.event.fields.description")}</Label>
            <Textarea
              id={`${formId}-description`}
              name="description"
              required
              placeholder={t("requests.event.fields.descriptionPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-participants`}>{t("requests.event.fields.participants")}</Label>
            <Input
              id={`${formId}-participants`}
              name="participants"
              type="number"
              min="1"
              placeholder={t("requests.event.fields.participantsPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-name`}>{t("requests.event.fields.contactName")}</Label>
            <Input
              id={`${formId}-name`}
              name="contactName"
              required
              placeholder={t("requests.event.fields.contactNamePlaceholder")}
            />
          </div>

        </>
      )}
    />
  );
}
