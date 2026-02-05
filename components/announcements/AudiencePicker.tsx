"use client";

import { useState, useMemo } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Person = {
  userId: string;
  name: string | null;
  email: string;
};

type AudiencePickerProps = {
  people: Person[];
  selected: string[];
  onChange: (userIds: string[]) => void;
};

export default function AudiencePicker({ people, selected, onChange }: AudiencePickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return people;
    return people.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        p.email.toLowerCase().includes(q)
    );
  }, [people, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.userId));

  const handleToggle = (userId: string) => {
    if (selected.includes(userId)) {
      onChange(selected.filter((id) => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  };

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map((p) => p.userId));
      onChange(selected.filter((id) => !filteredIds.has(id)));
    } else {
      const existing = new Set(selected);
      const newIds = filtered.filter((p) => !existing.has(p.userId)).map((p) => p.userId);
      onChange([...selected, ...newIds]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[180px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search people..."
            className="h-8 text-sm"
          />
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={handleSelectAll}>
          {allFilteredSelected ? "Deselect all" : "Select all"}
        </Button>
        <span className="text-xs text-ink-400">
          {selected.length} of {people.length} selected
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-card border border-mist-100 bg-mist-50">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-ink-400">No people found.</p>
        ) : (
          filtered.map((person) => (
            <label
              key={person.userId}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-mist-100 transition"
            >
              <input
                type="checkbox"
                checked={selected.includes(person.userId)}
                onChange={() => handleToggle(person.userId)}
                className="h-4 w-4 rounded border-mist-200 text-primary-600 focus-ring"
              />
              <span className="truncate text-ink-700">
                {person.name ?? person.email}
              </span>
              {person.name ? (
                <span className="truncate text-xs text-ink-400">{person.email}</span>
              ) : null}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
