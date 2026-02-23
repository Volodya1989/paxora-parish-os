import type { AccessGateStatus } from "@/lib/queries/access";
import { getTranslations } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";

type AccessGateContentProps = {
  status: AccessGateStatus;
  parishName?: string | null;
  locale: Locale;
};

export default function AccessGateContent({ status, parishName, locale }: AccessGateContentProps) {
  const t = getTranslations(locale);
  const parishLabel = parishName
    ? t("accessGate.parishLabelNamed").replace("{parish}", parishName)
    : t("accessGate.parishLabelFallback");

  if (status === "approved") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">{t("accessGate.approved.title")}</h2>
        <p className="text-sm text-ink-500">{t("accessGate.approved.nextAction")}</p>
        <p className="text-xs text-ink-400">{t("accessGate.approved.whatNext")}</p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">{t("accessGate.pending.title")}</h2>
        <p className="text-sm text-ink-500">{t("accessGate.pending.nextAction")}</p>
        <p className="text-xs text-ink-400">{t("accessGate.pending.whatNext")}</p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">{t("accessGate.rejected.title")}</h2>
        <p className="text-sm text-ink-500">{t("accessGate.rejected.nextAction")}</p>
        <p className="text-xs text-ink-400">{t("accessGate.rejected.whatNext")}</p>
      </div>
    );
  }

  if (status === "unverified") {
    return (
      <div className="space-y-2">
        <h2 className="text-h2">{t("accessGate.unverified.title")}</h2>
        <p className="text-sm text-ink-500">
          {t("accessGate.unverified.nextAction").replace("{parishLabel}", parishLabel)}
        </p>
        <p className="text-xs text-ink-400">{t("accessGate.unverified.whatNext")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-h2">{t("accessGate.none.title")}</h2>
      <p className="text-sm text-ink-500">
        {t("accessGate.none.nextAction").replace("{parishLabel}", parishLabel)}
      </p>
      <p className="text-xs text-ink-400">{t("accessGate.none.whatNext")}</p>
    </div>
  );
}
