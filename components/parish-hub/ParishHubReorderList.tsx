"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/ui/cn";
import {
  GripVerticalIcon,
  PencilIcon,
  TrashIcon,
  BulletinIcon,
  MassTimesIcon,
  ConfessionIcon,
  WebsiteIcon,
  CalendarIcon,
  ReadingsIcon,
  GivingIcon,
  ContactIcon
} from "@/components/icons/ParishIcons";
import type { ParishHubIcon } from "./ParishHubTile";
import type { SVGProps } from "react";

export type ParishHubAdminItem = {
  id: string;
  label: string;
  icon: ParishHubIcon;
  targetType: "EXTERNAL" | "INTERNAL";
  targetUrl: string | null;
  internalRoute: string | null;
  visibility: "PUBLIC" | "LOGGED_IN";
  order: number;
  enabled: boolean;
};

type ParishHubReorderListProps = {
  items: ParishHubAdminItem[];
  onReorder: (items: Array<{ itemId: string; order: number }>) => void;
  onEdit: (item: ParishHubAdminItem) => void;
  onDelete: (item: ParishHubAdminItem) => void;
  minEnabledCount: number;
};

const iconMap: Record<ParishHubIcon, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  BULLETIN: BulletinIcon,
  MASS_TIMES: MassTimesIcon,
  CONFESSION: ConfessionIcon,
  WEBSITE: WebsiteIcon,
  CALENDAR: CalendarIcon,
  READINGS: ReadingsIcon,
  GIVING: GivingIcon,
  CONTACT: ContactIcon
};

export default function ParishHubReorderList({
  items,
  onReorder,
  onEdit,
  onDelete,
  minEnabledCount
}: ParishHubReorderListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const sortedItems = [...items].sort((a, b) => a.order - b.order);
  const enabledCount = items.filter((item) => item.enabled).length;

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      const dragIndex = draggedIndex;

      if (dragIndex === null || dragIndex === dropIndex) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }

      const newItems = [...sortedItems];
      const [movedItem] = newItems.splice(dragIndex, 1);
      newItems.splice(dropIndex, 0, movedItem);

      const reorderedItems = newItems.map((item, index) => ({
        itemId: item.id,
        order: index + 1
      }));

      onReorder(reorderedItems);
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, sortedItems, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const canDelete = (item: ParishHubAdminItem): boolean => {
    if (!item.enabled) return true;
    return enabledCount > minEnabledCount;
  };

  return (
    <div className="space-y-2">
      {sortedItems.map((item, index) => {
        const IconComponent = iconMap[item.icon] ?? BulletinIcon;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-3 rounded-card border bg-white px-3 py-2 transition-all",
              isDragging && "opacity-50",
              isDragOver && "border-primary-400 bg-primary-50/50",
              !isDragging && !isDragOver && "border-mist-200",
              !item.enabled && "bg-mist-50"
            )}
          >
            <button
              type="button"
              className="cursor-grab touch-none text-ink-400 hover:text-ink-600 focus:outline-none active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVerticalIcon className="h-5 w-5" />
            </button>

            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full",
                item.enabled ? "bg-mist-100 text-ink-700" : "bg-mist-100 text-ink-400"
              )}
            >
              <IconComponent className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    item.enabled ? "text-ink-900" : "text-ink-500"
                  )}
                >
                  {item.label}
                </p>
                {!item.enabled && (
                  <span className="rounded-full bg-mist-200 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                    Disabled
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-ink-500">
                {item.targetType === "EXTERNAL" ? item.targetUrl : item.internalRoute}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-button text-ink-500 transition hover:bg-mist-100 hover:text-ink-700 focus-ring"
                aria-label={`Edit ${item.label}`}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                disabled={!canDelete(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-button text-ink-500 transition hover:bg-rose-50 hover:text-rose-600 focus-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-500"
                aria-label={`Delete ${item.label}`}
                title={
                  !canDelete(item)
                    ? `Cannot delete: at least ${minEnabledCount} enabled tiles required`
                    : undefined
                }
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {sortedItems.length === 0 && (
        <div className="rounded-card border border-dashed border-mist-200 bg-mist-50/50 px-4 py-8 text-center">
          <p className="text-sm text-ink-500">No tiles configured</p>
        </div>
      )}
    </div>
  );
}
