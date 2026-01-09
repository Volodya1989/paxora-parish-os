"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import MobileTabs from "@/components/navigation/MobileTabs";
import Sidebar from "@/components/navigation/Sidebar";
import { ToastProvider, ToastViewport } from "@/components/ui/Toast";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar currentPath={pathname} />
        <div className="flex min-h-screen flex-1 flex-col">
          {children}
          <MobileTabs currentPath={pathname} />
        </div>
      </div>
      <ToastViewport />
    </ToastProvider>
  );
}

export default AppShell;
