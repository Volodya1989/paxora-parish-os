"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MobileTabs from "@/components/navigation/MobileTabs";
import Sidebar from "@/components/navigation/Sidebar";
import NotificationProvider from "@/components/notifications/NotificationProvider";
import { ToastProvider, ToastViewport, useToast } from "@/components/ui/Toast";
import PushRegistration from "@/components/push/PushRegistration";
import ImpersonationBanner from "@/components/platform/ImpersonationBanner";
import EngagementPrompts from "@/components/pwa/EngagementPrompts";
import { useTranslations } from "@/lib/i18n/provider";

type AppShellProps = {
  children: ReactNode;
  parishRole?: "ADMIN" | "SHEPHERD" | "MEMBER" | null;
  platformRole?: "SUPERADMIN" | null;
  impersonation?: {
    parishId: string;
    parishName: string | null;
  } | null;
};

export function AppShell({ children, parishRole, platformRole, impersonation }: AppShellProps) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <NotificationProvider>
        <PushRegistration />
        <EngagementPrompts />
        <InviteToastListener />
        <div className="flex min-h-screen w-full">
          <Sidebar currentPath={pathname} parishRole={parishRole} platformRole={platformRole} />
          <div className="flex min-h-screen flex-1 flex-col">
            {impersonation ? (
              <ImpersonationBanner parishName={impersonation.parishName} />
            ) : null}
            {children}
            <MobileTabs currentPath={pathname} parishRole={parishRole} platformRole={platformRole} />
          </div>
        </div>
        <ToastViewport />
      </NotificationProvider>
    </ToastProvider>
  );
}

function InviteToastListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations();
  const inviteToastShown = useRef(false);

  useEffect(() => {
    const inviteStatus = searchParams.get("invite");
    if (inviteStatus === "accepted" && !inviteToastShown.current) {
      addToast({
        title: t("invite.accepted"),
        description: t("invite.welcomeMessage"),
        status: "success"
      });
      inviteToastShown.current = true;
      router.replace(pathname);
    }
  }, [addToast, pathname, router, searchParams, t]);

  return null;
}

export default AppShell;
