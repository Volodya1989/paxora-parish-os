"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import type { TaskFilters } from "@/lib/queries/tasks";

type TaskFiltersProps = {
  filters: TaskFilters;
  groupOptions: Array<{ id: string; name: string }>;
  showOwnership?: boolean;
  searchPlaceholder?: string;
  layout?: "inline" | "stacked";
};

export default function TaskFilters({
  filters,
  groupOptions,
  showOwnership = true,
  searchPlaceholder = "Search serve items or notes",
  layout = "inline"
}: TaskFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queryValue, setQueryValue] = useState(filters.query ?? "");
  const statusId = useId();
  const ownerId = useId();
  const groupId = useId();
  const searchId = useId();

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

  return (
    <form
      onSubmit={handleSearchSubmit}
      className={
        layout === "stacked"
          ? "flex flex-col gap-4"
          : "grid gap-4 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      }
    >
      <div className="space-y-2">
        <Label htmlFor={statusId}>Status</Label>
        <SelectMenu
          id={statusId}
          value={filters.status}
          onValueChange={(value) => updateParam("status", value)}
          options={[
            { value: "all", label: "All" },
            { value: "open", label: "Open" },
            { value: "in-progress", label: "In progress" },
            { value: "done", label: "Done" }
          ]}
        />
      </div>

      {showOwnership ? (
        <div className="space-y-2">
          <Label htmlFor={ownerId}>Ownership</Label>
          <SelectMenu
            id={ownerId}
            value={filters.ownership}
            onValueChange={(value) => updateParam("owner", value)}
            options={[
              { value: "all", label: "All" },
              { value: "mine", label: "Mine" }
            ]}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={groupId}>Group</Label>
        <SelectMenu
          id={groupId}
          value={filters.groupId ?? "all"}
          onValueChange={(value) => updateParam("group", value)}
          options={[
            { value: "all", label: "All groups" },
            ...groupOptions.map((group) => ({ value: group.id, label: group.name }))
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={searchId}>Search</Label>
        <Input
          id={searchId}
          value={queryValue}
          onChange={(event) => setQueryValue(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </div>

      <div className="flex items-end">
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </div>
    </form>
  );
}
