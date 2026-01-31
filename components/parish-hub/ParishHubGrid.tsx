"use client";

import ParishHubTile, { type ParishHubItemData } from "./ParishHubTile";

type ParishHubGridProps = {
  items: ParishHubItemData[];
};

export default function ParishHubGrid({ items }: ParishHubGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ParishHubTile key={item.id} item={item} />
      ))}
    </div>
  );
}
