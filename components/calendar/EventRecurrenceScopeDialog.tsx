"use client";

import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";
import { useTranslations } from "@/lib/i18n/provider";

export type RecurrenceScope = "THIS_EVENT" | "THIS_SERIES";

export default function EventRecurrenceScopeDialog({
  open,
  onClose,
  onConfirm,
  scope,
  onScopeChange,
  mode
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  scope: RecurrenceScope;
  onScopeChange: (value: RecurrenceScope) => void;
  mode: "edit" | "delete";
}) {
  const t = useTranslations();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const body = (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">
        {mode === "edit" ? t("eventRecurrence.editDescription") : t("eventRecurrence.deleteDescription")}
      </p>
      <label className="flex items-start gap-2 rounded-xl border border-mist-200 px-3 py-2">
        <input
          type="radio"
          name="scope"
          checked={scope === "THIS_EVENT"}
          onChange={() => onScopeChange("THIS_EVENT")}
        />
        <span className="text-sm">
          <span className="font-medium text-ink-800">{t("eventRecurrence.thisEvent")}</span>
          <span className="block text-ink-500">{t("eventRecurrence.thisEventHint")}</span>
        </span>
      </label>
      <label className="flex items-start gap-2 rounded-xl border border-mist-200 px-3 py-2">
        <input
          type="radio"
          name="scope"
          checked={scope === "THIS_SERIES"}
          onChange={() => onScopeChange("THIS_SERIES")}
        />
        <span className="text-sm">
          <span className="font-medium text-ink-800">{t("eventRecurrence.thisSeries")}</span>
          <span className="block text-ink-500">{t("eventRecurrence.thisSeriesHint")}</span>
        </span>
      </label>
    </div>
  );

  const footer = (
    <>
      <Button type="button" variant="secondary" onClick={onClose}>
        {t("buttons.cancel")}
      </Button>
      <Button type="button" onClick={onConfirm}>
        {t("buttons.next")}
      </Button>
    </>
  );

  const title = mode === "edit" ? t("eventRecurrence.editTitle") : t("eventRecurrence.deleteTitle");

  return isDesktop ? (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      {body}
    </Modal>
  ) : (
    <Drawer open={open} onClose={onClose} title={title} footer={footer}>
      {body}
    </Drawer>
  );
}
