"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import type { TaskFilters } from "@/lib/queries/tasks";

type TaskFiltersProps = {
  filters: TaskFilters;
  groupOptions: Array<{ id: string; name: string }>;
};

export default function TaskFilters({ filters, groupOptions }: TaskFiltersProps) {
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
      className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
    >
      <div className="space-y-2">
        <Label htmlFor={statusId}>Status</Label>
        <Select
          id={statusId}
          value={filters.status}
          onChange={(event) => updateParam("status", event.target.value)}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="done">Done</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={ownerId}>Ownership</Label>
        <Select
          id={ownerId}
          value={filters.ownership}
          onChange={(event) => updateParam("owner", event.target.value)}
        >
          <option value="all">All</option>
          <option value="mine">Mine</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={groupId}>Group</Label>
        <Select
          id={groupId}
          value={filters.groupId ?? "all"}
          onChange={(event) => updateParam("group", event.target.value)}
        >
          <option value="all">All groups</option>
          {groupOptions.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={searchId}>Search</Label>
        <Input
          id={searchId}
          value={queryValue}
          onChange={(event) => setQueryValue(event.target.value)}
          placeholder="Search tasks or notes"
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
