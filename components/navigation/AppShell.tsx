"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import MobileTabs from "@/components/navigation/MobileTabs";
import Sidebar from "@/components/navigation/Sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar currentPath={pathname} />
      <div className="flex min-h-screen flex-1 flex-col">
        {children}
        <MobileTabs currentPath={pathname} />
      </div>
    </div>
  );
}

export default AppShell;
