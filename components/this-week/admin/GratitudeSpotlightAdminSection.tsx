"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GratitudeSpotlightCard from "@/components/gratitude/GratitudeSpotlightCard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import GratitudeSpotlightAdminPanel from "@/components/this-week/admin/GratitudeSpotlightAdminPanel";
import { HandHeartIcon } from "@/components/icons/ParishIcons";
import { useTranslations } from "@/lib/i18n/provider";

type GratitudeSpotlightAdminSectionProps = {
  weekId: string;
  spotlight: {
    enabled: boolean;
    limit: number;
    items: Array<{
      id: string;
      nomineeName: string;
      reason: string;
    }>;
  };
  admin: {
    settings: {
      enabled: boolean;
      limit: number;
    };
    nominations: Array<{
      id: string;
      reason: string;
      status: "DRAFT" | "PUBLISHED";
      nominee: { id: string; name: string };
    }>;
    memberOptions: Array<{ id: string; name: string; label?: string }>;
  } | null;
};

export default function GratitudeSpotlightAdminSection({
  weekId,
  spotlight,
  admin
}: GratitudeSpotlightAdminSectionProps) {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    const shouldOpenFromLink = searchParams?.get("openNominees") === "1";
    if (admin && shouldOpenFromLink) {
      setShowAdminPanel(true);
    }
  }, [admin, searchParams]);

  if (!admin) {
    return (
      <div className="space-y-3">
        <GratitudeSpotlightCard
          enabled={spotlight.enabled}
          limit={spotlight.limit}
          items={spotlight.items}
          showCta
        />
      </div>
    );
  }

  const panelTitle = t("thisWeek.gratitudeSpotlight.adminTitle");
  const hasPublishedItems = spotlight.enabled && spotlight.items.length > 0;

  return (
    <div className="space-y-3">
      {hasPublishedItems ? (
        <GratitudeSpotlightCard
          enabled={spotlight.enabled}
          limit={spotlight.limit}
          items={spotlight.items}
          showCta
          headerActions={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setShowAdminPanel(true)}
              aria-expanded={showAdminPanel}
            >
              {t("thisWeek.gratitudeSpotlight.addNominee")}
            </Button>
          }
        />
      ) : (
        <Card className="border border-rose-200 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 p-4 shadow-sm">
          <button
            type="button"
            className="group flex w-full items-center gap-3 text-left"
            onClick={() => setShowAdminPanel(true)}
            aria-expanded={showAdminPanel}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <HandHeartIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-900">{t("thisWeek.gratitudeCard.title")}</p>
              <p className="text-xs text-rose-700">{t("thisWeek.gratitudeCard.description")}</p>
            </div>
            <span className="text-sm font-semibold text-rose-500 transition group-hover:text-rose-700">
              {t("thisWeek.gratitudeCard.cta")}
            </span>
          </button>
        </Card>
      )}

      <Modal open={showAdminPanel} onClose={() => setShowAdminPanel(false)} title={panelTitle}>
        <GratitudeSpotlightAdminPanel
          weekId={weekId}
          settings={admin.settings}
          nominations={admin.nominations}
          memberOptions={admin.memberOptions}
          withCard={false}
          showHeader={false}
        />
      </Modal>
      <Drawer open={showAdminPanel} onClose={() => setShowAdminPanel(false)} title={panelTitle}>
        <GratitudeSpotlightAdminPanel
          weekId={weekId}
          settings={admin.settings}
          nominations={admin.nominations}
          memberOptions={admin.memberOptions}
          compact
          withCard={false}
          showHeader={false}
        />
      </Drawer>
    </div>
  );
}
