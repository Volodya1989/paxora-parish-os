"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MobileTabs from "@/components/navigation/MobileTabs";
import Sidebar from "@/components/navigation/Sidebar";
import { ToastProvider, ToastViewport, useToast } from "@/components/ui/Toast";
import PushRegistration from "@/components/push/PushRegistration";

type AppShellProps = {
  children: ReactNode;
  parishRole?: "ADMIN" | "SHEPHERD" | "MEMBER" | null;
};

export function AppShell({ children, parishRole }: AppShellProps) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <PushRegistration />
      <InviteToastListener />
      <div className="flex min-h-screen w-full">
        <Sidebar currentPath={pathname} parishRole={parishRole} />
        <div className="flex min-h-screen flex-1 flex-col">
          {children}
          <MobileTabs currentPath={pathname} parishRole={parishRole} />
        </div>
      </div>
      <ToastViewport />
    </ToastProvider>
  );
}

function InviteToastListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const inviteToastShown = useRef(false);

  useEffect(() => {
    const inviteStatus = searchParams.get("invite");
    if (inviteStatus === "accepted" && !inviteToastShown.current) {
      addToast({
        title: "Invite accepted",
        description: "Welcome to your parish community.",
        status: "success"
      });
      inviteToastShown.current = true;
      router.replace(pathname);
    }
  }, [addToast, pathname, router, searchParams]);

  return null;
}

export default AppShell;
