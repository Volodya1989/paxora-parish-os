"use client";

import { useState } from "react";
import GratitudeSpotlightCard from "@/components/gratitude/GratitudeSpotlightCard";
import Button from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import GratitudeSpotlightAdminPanel from "@/components/this-week/admin/GratitudeSpotlightAdminPanel";

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
  const [showAdminPanel, setShowAdminPanel] = useState(false);

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

  const canManage = true;
  const panelTitle = "Gratitude Spotlight (Admin)";

  return (
    <div className="space-y-3">
      <GratitudeSpotlightCard
        enabled={spotlight.enabled}
        limit={spotlight.limit}
        items={spotlight.items}
        showCta
        headerActions={
          canManage ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setShowAdminPanel(true)}
              aria-expanded={showAdminPanel}
            >
              Add nominee
            </Button>
          ) : null
        }
      />
      {canManage ? (
        <>
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
        </>
      ) : null}
    </div>
  );
}
