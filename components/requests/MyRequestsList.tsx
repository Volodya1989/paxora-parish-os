"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RequestListItem } from "@/lib/queries/requests";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatMessageTime } from "@/lib/time/messageTime";
import { REQUEST_STATUS_TONES } from "@/lib/requests/utils";
import { useTranslations } from "@/lib/i18n/provider";
import { useToast } from "@/components/ui/Toast";

export default function MyRequestsList({ requests }: { requests: RequestListItem[] }) {
  const t = useTranslations();
  const { addToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledDeletedToast = useRef(false);

  useEffect(() => {
    if (handledDeletedToast.current) return;
    if (searchParams?.get("deleted") !== "1") return;

    handledDeletedToast.current = true;
    addToast({ title: "Request deleted.", status: "success" });
    router.replace(pathname, { scroll: false });
  }, [addToast, pathname, router, searchParams]);

  if (!requests.length) {
    return (
      <Card>
        <CardTitle>{t("requests.list.emptyTitle")}</CardTitle>
        <CardDescription>{t("requests.list.emptyDescription")}</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Link key={request.id} href={`/requests/${request.id}`} className="block rounded-card focus-ring">
          <Card className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <CardTitle className="min-w-0 text-base break-words">{request.title}</CardTitle>
              <Badge tone={REQUEST_STATUS_TONES[request.status]} className="w-fit self-start">
                {t(`requests.status.${request.status}`)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
              <span>{t(`requests.type.${request.type}.label`)}</span>
              <span aria-hidden="true">•</span>
              <span>{t("requests.list.submittedAt").replace("{time}", formatMessageTime(request.createdAt))}</span>
              <span aria-hidden="true">•</span>
              <span>{t("requests.list.updatedAt").replace("{time}", formatMessageTime(request.updatedAt))}</span>
              {request.assignedTo?.name ? (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{t("requests.list.assignedTo").replace("{name}", request.assignedTo.name)}</span>
                </>
              ) : null}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
