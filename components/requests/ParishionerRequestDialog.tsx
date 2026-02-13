"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import RequestDialog from "@/components/shared/RequestDialog";
import { submitParishionerContextRequest } from "@/server/actions/requests";
import { useTranslations } from "@/lib/i18n/provider";

type ParishionerRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requesterEmail: string;
  sourceScreen: "serve" | "groups" | "events";
  groupOptions: Array<{ id: string; name: string }>;
};

type RequestEntityType = "EVENT" | "SERVE_TASK" | "GROUP";
type RequestScope = "PUBLIC" | "GROUP";

export default function ParishionerRequestDialog({
  open,
  onOpenChange,
  requesterEmail,
  sourceScreen,
  groupOptions
}: ParishionerRequestDialogProps) {
  const t = useTranslations();
  const formId = useId();
  const [entityType, setEntityType] = useState<RequestEntityType>("EVENT");
  const [scope, setScope] = useState<RequestScope>("PUBLIC");

  useEffect(() => {
    if (!open) return;
    setEntityType("EVENT");
    setScope("PUBLIC");
  }, [open]);

  const supportsScope = entityType !== "GROUP";
  const canUseGroupScope = groupOptions.length > 0;
  const showGroupSelector = supportsScope && scope === "GROUP";

  const defaultTitle = useMemo(() => {
    if (entityType === "EVENT") return t("requests.createContent.defaults.event");
    if (entityType === "SERVE_TASK") return t("requests.createContent.defaults.serveTask");
    return t("requests.createContent.defaults.group");
  }, [entityType, t]);

  return (
    <RequestDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("requests.createContent.modalTitle")}
      description={t("requests.createContent.modalDescription")}
      successMessage={t("requests.createContent.success")}
      onSubmit={submitParishionerContextRequest}
      submitLabel={t("requests.createContent.submit")}
      renderFields={() => (
        <>
          <input type="hidden" name="sourceScreen" value={sourceScreen} />

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-from`}>{t("requests.createContent.fromEmail")}</Label>
            <Input id={`${formId}-from`} value={requesterEmail} readOnly disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-entity`}>{t("requests.createContent.requestType")}</Label>
            <Select
              id={`${formId}-entity`}
              name="requestedEntityType"
              value={entityType}
              onChange={(event) => {
                const next = event.target.value as RequestEntityType;
                setEntityType(next);
                if (next === "GROUP") {
                  setScope("PUBLIC");
                }
              }}
              required
            >
              <option value="EVENT">{t("requests.createContent.types.event")}</option>
              <option value="SERVE_TASK">{t("requests.createContent.types.serveTask")}</option>
              <option value="GROUP">{t("requests.createContent.types.group")}</option>
            </Select>
          </div>

          {supportsScope ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-scope`}>{t("requests.createContent.scope")}</Label>
              <Select
                id={`${formId}-scope`}
                name="scope"
                value={scope}
                onChange={(event) => setScope(event.target.value as RequestScope)}
                required
              >
                <option value="PUBLIC">{t("requests.createContent.scopes.public")}</option>
                <option value="GROUP" disabled={!canUseGroupScope}>
                  {t("requests.createContent.scopes.group")}
                </option>
              </Select>
              {!canUseGroupScope ? (
                <p className="text-xs text-ink-500">{t("requests.createContent.joinGroupHint")}</p>
              ) : null}
            </div>
          ) : (
            <input type="hidden" name="scope" value="PUBLIC" />
          )}

          {showGroupSelector ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-group`}>{t("requests.createContent.group")}</Label>
              <Select id={`${formId}-group`} name="groupId" required>
                <option value="">{t("requests.createContent.selectGroup")}</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-title`}>{t("requests.createContent.title")}</Label>
            <Input
              id={`${formId}-title`}
              name="title"
              required
              defaultValue={defaultTitle}
              placeholder={t("requests.createContent.titlePlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-description`}>{t("requests.createContent.description")}</Label>
            <Textarea
              id={`${formId}-description`}
              name="description"
              required
              minLength={15}
              placeholder={t("requests.createContent.descriptionPlaceholder")}
            />
          </div>

          {entityType === "EVENT" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-event-date`}>{t("requests.createContent.eventDateOptional")}</Label>
                <Input id={`${formId}-event-date`} name="eventDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-event-time`}>{t("requests.createContent.eventTimeOptional")}</Label>
                <Input id={`${formId}-event-time`} name="eventTime" type="time" />
              </div>
            </div>
          ) : null}

          {entityType === "SERVE_TASK" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-needed-by`}>{t("requests.createContent.neededByOptional")}</Label>
              <Input id={`${formId}-needed-by`} name="taskNeededByDate" type="date" />
            </div>
          ) : null}
        </>
      )}
    />
  );
}
