"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useTranslations } from "@/lib/i18n/provider";
import ReportContentDialog from "@/components/moderation/ReportContentDialog";

type ReportContentButtonProps = {
  contentType: "CHAT_MESSAGE" | "ANNOUNCEMENT" | "GROUP_CONTENT";
  contentId: string;
  variant?: "ghost" | "secondary";
  size?: "sm" | "md";
  className?: string;
};

export default function ReportContentButton({
  contentType,
  contentId,
  variant = "ghost",
  size = "sm",
  className
}: ReportContentButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations();

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setDialogOpen(true)}
      >
        {t("common.reportContent")}
      </Button>
      <ReportContentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contentType={contentType}
        contentId={contentId}
      />
    </>
  );
}
