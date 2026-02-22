"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { updateContentReportStatus } from "@/server/actions/content-reports";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/lib/i18n/provider";

type ReportRow = {
  id: string;
  contentType: "CHAT_MESSAGE" | "ANNOUNCEMENT" | "GROUP_CONTENT";
  contentId: string;
  reason: string | null;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  createdAt: Date;
  reporter: {
    id: string;
    name: string | null;
    email: string;
  };
};

export default function ContentReportsQueue({ reports }: { reports: ReportRow[] }) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const router = useRouter();
  const t = useTranslations();

  const updateStatus = (reportId: string, status: "REVIEWED" | "DISMISSED") => {
    startTransition(async () => {
      try {
        await updateContentReportStatus({ reportId, status });
        addToast({ title: t("moderation.reportUpdated"), status: "success" });
        router.refresh();
      } catch (error) {
        addToast({
          title: t("moderation.reportUpdateFailed"),
          description: t("moderation.reportUpdateFailedDescription"),
          status: "error"
        });
      }
    });
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-mist-100">
          <thead className="bg-mist-50">
            <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3 font-semibold">{t("moderation.queue.type")}</th>
              <th className="px-4 py-3 font-semibold">{t("moderation.queue.targetId")}</th>
              <th className="px-4 py-3 font-semibold">{t("moderation.queue.reason")}</th>
              <th className="px-4 py-3 font-semibold">{t("moderation.queue.reporter")}</th>
              <th className="px-4 py-3 font-semibold">{t("moderation.queue.created")}</th>
              <th className="px-4 py-3 font-semibold">{t("moderation.queue.status")}</th>
              <th className="px-4 py-3 font-semibold">{t("moderation.queue.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100 bg-white">
            {reports.map((report) => (
              <tr key={report.id} className="text-sm text-ink-700">
                <td className="px-4 py-3">{report.contentType}</td>
                <td className="px-4 py-3 font-mono text-xs">{report.contentId}</td>
                <td className="max-w-xs px-4 py-3">
                  {report.reason ? (
                    <span className="line-clamp-3 text-sm text-ink-600">{report.reason}</span>
                  ) : (
                    <span className="text-xs text-ink-400">{t("moderation.queue.emptyAction")}</span>
                  )}
                </td>
                <td className="px-4 py-3">{report.reporter.name ?? report.reporter.email}</td>
                <td className="px-4 py-3">{new Date(report.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{report.status}</td>
                <td className="px-4 py-3">
                  {report.status === "OPEN" ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => updateStatus(report.id, "REVIEWED")}
                      >
                        {t("moderation.queue.markReviewed")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => updateStatus(report.id, "DISMISSED")}
                      >
                        {t("moderation.queue.dismiss")}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-400">{t("moderation.queue.emptyAction")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
