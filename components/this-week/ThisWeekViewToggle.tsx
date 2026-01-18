"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import type { ThisWeekViewMode } from "@/lib/this-week/viewMode";

type ThisWeekViewToggleProps = {
  value: ThisWeekViewMode;
};

export default function ThisWeekViewToggle({ value }: ThisWeekViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleChange = useCallback(
    (nextValue: ThisWeekViewMode) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set("view", nextValue);

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
        router.refresh();
      });
    },
    [pathname, router, searchParams]
  );

  return (
    <Tabs value={value} onValueChange={handleChange}>
      <TabsList className="self-start">
        <TabsTrigger value="admin">Admin</TabsTrigger>
        <TabsTrigger value="parishioner">Parishioner</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
