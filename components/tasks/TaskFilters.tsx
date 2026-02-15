"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import type { TaskFilters } from "@/lib/queries/tasks";
import { useTranslations } from "@/lib/i18n/provider";

type TaskFiltersProps = {
  filters: TaskFilters;
  groupOptions: Array<{ id: string; name: string }>;
  showOwnership?: boolean;
  showGroup?: boolean;
  searchPlaceholder?: string;
  groupDisabledHint?: string;
  layout?: "inline" | "stacked";
};

export default function TaskFilters({
  filters,
  groupOptions,
  showOwnership = true,
  showGroup = true,
  searchPlaceholder,
  groupDisabledHint,
  layout = "inline"
}: TaskFiltersProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queryValue, setQueryValue] = useState(filters.query ?? "");
  const statusId = useId();
  const ownerId = useId();
  const groupId = useId();
  const searchId = useId();
  const dateFromId = useId();
  const dateToId = useId();

  useEffect(() => {
    setQueryValue(filters.query ?? "");
  }, [filters.query]);

  const buildParams = useMemo(
    () => new URLSearchParams(searchParams?.toString() ?? ""),
    [searchParams]
  );

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(buildParams.toString());
    params.delete("create");

    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParam("q", queryValue.trim() ? queryValue.trim() : undefined);
  };

  const resolvedSearchPlaceholder = searchPlaceholder ?? t("tasks.filters.searchServeItems");

  return (
    <form
      onSubmit={handleSearchSubmit}
      className={
        layout === "stacked"
          ? "flex flex-col gap-4"
          : "grid gap-4 md:grid-cols-[repeat(6,minmax(0,1fr))_auto]"
      }
    >
      <div className="space-y-2">
        <Label htmlFor={statusId}>{t("tasks.filters.status")}</Label>
        <SelectMenu
          id={statusId}
          value={filters.status}
          onValueChange={(value) => updateParam("status", value)}
          options={[
            { value: "all", label: t("tasks.view.all") },
            { value: "open", label: t("common.todo") },
            { value: "in-progress", label: t("common.inProgress") },
            { value: "done", label: t("common.done") },
            { value: "archived", label: t("groups.filters.archived") }
          ]}
        />
      </div>

      {showOwnership ? (
        <div className="space-y-2">
          <Label htmlFor={ownerId}>{t("tasks.filters.ownership")}</Label>
          <SelectMenu
            id={ownerId}
            value={filters.ownership}
            onValueChange={(value) => updateParam("owner", value)}
            options={[
              { value: "all", label: t("tasks.view.all") },
              { value: "mine", label: t("tasks.filters.mine") }
            ]}
          />
        </div>
      ) : null}

      {showGroup ? (
        <div className="space-y-2">
          <Label htmlFor={groupId}>{t("tasks.filters.group")}</Label>
          <SelectMenu
            id={groupId}
            value={filters.groupId ?? "all"}
            disabled={groupOptions.length === 0 && Boolean(groupDisabledHint)}
            onValueChange={(value) => updateParam("group", value)}
            options={[
              { value: "all", label: t("tasks.filters.allGroups") },
              ...groupOptions.map((group) => ({ value: group.id, label: group.name }))
            ]}
          />
          {groupOptions.length === 0 && groupDisabledHint ? (
            <p className="text-xs text-ink-500">{groupDisabledHint}</p>
          ) : null}
        </div>
      ) : null}


      <div className="space-y-2">
        <Label htmlFor={dateFromId}>{t("tasks.filters.dateFrom")}</Label>
        <Input
          id={dateFromId}
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(event) => updateParam("dateFrom", event.target.value || undefined)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={dateToId}>{t("tasks.filters.dateTo")}</Label>
        <Input
          id={dateToId}
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(event) => updateParam("dateTo", event.target.value || undefined)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={searchId}>{t("tasks.filters.search")}</Label>
        <Input
          id={searchId}
          value={queryValue}
          onChange={(event) => setQueryValue(event.target.value)}
          placeholder={resolvedSearchPlaceholder}
        />
      </div>

      <div className="flex items-end">
        <Button type="submit" variant="secondary">
          {t("tasks.filters.searchButton")}
        </Button>
      </div>
    </form>
  );
}
