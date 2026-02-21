"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { submitContentReport } from "@/server/actions/content-reports";
import { useTranslations } from "@/lib/i18n/provider";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();
  const t = useTranslations();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isSubmitting}
      onClick={async () => {
        try {
          setIsSubmitting(true);
          const result = await submitContentReport({ contentType, contentId });
          addToast({
            title: result.duplicate
              ? t("moderation.reportAlreadySubmitted")
              : t("moderation.reportSubmitted"),
            description: result.duplicate
              ? t("moderation.reportAlreadySubmittedDescription")
              : t("moderation.reportSubmittedDescription"),
            status: "success"
          });
        } catch (error) {
          addToast({
            title: t("moderation.reportFailed"),
            description: t("moderation.reportFailedDescription"),
            status: "error"
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      {t("common.reportContent")}
    </Button>
  );
}
