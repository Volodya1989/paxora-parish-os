"use client";

import { useId, useMemo } from "react";
import type { GroupOption } from "@/components/requests/CreateContentRequestButton";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import RequestDialog from "@/components/shared/RequestDialog";
import { submitContentCreationRequest } from "@/server/actions/requests";
import { useTranslations } from "@/lib/i18n/provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceScreen: "serve" | "groups" | "events";
  groupOptions: GroupOption[];
};

export default function CreateContentRequestDialog({
  open,
  onOpenChange,
  sourceScreen,
  groupOptions
}: Props) {
  const t = useTranslations();
  const formId = useId();

  const hasGroups = groupOptions.length > 0;
  const title = t("requests.createContent.modalTitle");

  const defaultSubject = useMemo(() => {
    if (sourceScreen === "events") return t("requests.createContent.defaultTitleEvent");
    if (sourceScreen === "groups") return t("requests.createContent.defaultTitleGroup");
    return t("requests.createContent.defaultTitleServe");
  }, [sourceScreen, t]);

  return (
    <RequestDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={t("requests.createContent.modalDescription")}
      successMessage={t("requests.createContent.success")}
      submitLabel={t("requests.createContent.submit")}
      onSubmit={submitContentCreationRequest}
      renderFields={() => (
        <>
          <input type="hidden" name="sourceScreen" value={sourceScreen} />

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-type`}>{t("requests.createContent.type")}</Label>
            <Select id={`${formId}-type`} name="requestedEntityType" required defaultValue={sourceScreen === "groups" ? "GROUP" : sourceScreen === "events" ? "EVENT" : "SERVE_TASK"}>
              <option value="EVENT">{t("requests.createContent.typeEvent")}</option>
              <option value="SERVE_TASK">{t("requests.createContent.typeServe")}</option>
              <option value="GROUP">{t("requests.createContent.typeGroup")}</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-scope`}>{t("requests.createContent.scope")}</Label>
            <Select id={`${formId}-scope`} name="scope" defaultValue="PUBLIC">
              <option value="PUBLIC">{t("requests.createContent.scopePublic")}</option>
              <option value="GROUP" disabled={!hasGroups}>{t("requests.createContent.scopeGroup")}</option>
            </Select>
            {!hasGroups ? <p className="text-xs text-ink-500">{t("requests.createContent.scopeGroupHint")}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-group`}>{t("tasks.filters.group")}</Label>
            <Select id={`${formId}-group`} name="groupId" defaultValue="">
              <option value="">{t("requests.createContent.noGroup")}</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-title`}>{t("requests.createContent.title")}</Label>
            <Input id={`${formId}-title`} name="title" required defaultValue={defaultSubject} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-eventDate`}>{t("requests.createContent.eventDateOptional")}</Label>
              <Input id={`${formId}-eventDate`} name="eventDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-neededBy`}>{t("requests.createContent.neededByOptional")}</Label>
              <Input id={`${formId}-neededBy`} name="neededByDate" type="date" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-description`}>{t("requests.createContent.description")}</Label>
            <Textarea id={`${formId}-description`} name="description" minLength={15} required rows={4} placeholder={t("requests.createContent.descriptionPlaceholder")} />
          </div>
        </>
      )}
    />
  );
}
