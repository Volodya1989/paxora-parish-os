"use client";

import { useState, useTransition, useMemo } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/ui/cn";
import { PlusIcon } from "@/components/icons/ParishIcons";
import ParishHubItemForm, { type ParishHubItemFormData } from "./ParishHubItemForm";
import ParishHubReorderList, { type ParishHubAdminItem } from "./ParishHubReorderList";
import {
  createParishHubItem,
  updateParishHubItem,
  deleteParishHubItem,
  reorderParishHubItems,
  updateParishHubSettings
} from "@/server/actions/parish-hub";

const MIN_ENABLED_TILES = 4;
const MAX_TOTAL_TILES = 12;

type ParishHubAdminPanelProps = {
  parishId: string;
  userId: string;
  items: ParishHubAdminItem[];
  hubGridEnabled: boolean;
  hubGridPublicEnabled: boolean;
};

export default function ParishHubAdminPanel({
  parishId,
  userId,
  items: initialItems,
  hubGridEnabled: initialHubGridEnabled,
  hubGridPublicEnabled: initialHubGridPublicEnabled
}: ParishHubAdminPanelProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Local state
  const [items, setItems] = useState<ParishHubAdminItem[]>(initialItems);
  const [hubGridEnabled, setHubGridEnabled] = useState(initialHubGridEnabled);
  const [hubGridPublicEnabled, setHubGridPublicEnabled] = useState(initialHubGridPublicEnabled);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<ParishHubAdminItem | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ParishHubAdminItem | null>(null);

  // Computed values
  const enabledCount = useMemo(() => items.filter((item) => item.enabled).length, [items]);
  const totalCount = items.length;
  const canAddMore = totalCount < MAX_TOTAL_TILES;
  const canEnableGrid = enabledCount >= MIN_ENABLED_TILES;

  // Validation messages
  const validationMessages = useMemo(() => {
    const messages: string[] = [];
    if (enabledCount < MIN_ENABLED_TILES) {
      messages.push(`At least ${MIN_ENABLED_TILES} enabled tiles required to enable the hub grid.`);
    }
    if (totalCount >= MAX_TOTAL_TILES) {
      messages.push(`Maximum of ${MAX_TOTAL_TILES} tiles reached.`);
    }
    return messages;
  }, [enabledCount, totalCount]);

  // Handlers
  const handleToggleHubGrid = () => {
    if (!hubGridEnabled && !canEnableGrid) {
      addToast({
        title: "Cannot enable hub grid",
        description: `At least ${MIN_ENABLED_TILES} enabled tiles are required.`,
        status: "warning"
      });
      return;
    }

    const newValue = !hubGridEnabled;
    setHubGridEnabled(newValue);

    startTransition(async () => {
      try {
        await updateParishHubSettings({
          parishId,
          actorUserId: userId,
          hubGridEnabled: newValue
        });
        addToast({
          title: newValue ? "Parish Hub enabled" : "Parish Hub disabled",
          status: "info"
        });
      } catch (error) {
        setHubGridEnabled(!newValue); // Revert
        addToast({
          title: "Failed to update settings",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  const handleTogglePublicVisibility = () => {
    const newValue = !hubGridPublicEnabled;
    setHubGridPublicEnabled(newValue);

    startTransition(async () => {
      try {
        await updateParishHubSettings({
          parishId,
          actorUserId: userId,
          hubGridPublicEnabled: newValue
        });
        addToast({
          title: newValue ? "Hub visible to public" : "Hub visible to members only",
          status: "info"
        });
      } catch (error) {
        setHubGridPublicEnabled(!newValue); // Revert
        addToast({
          title: "Failed to update settings",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  const handleAddTile = () => {
    if (!canAddMore) {
      addToast({
        title: "Cannot add tile",
        description: `Maximum of ${MAX_TOTAL_TILES} tiles reached.`,
        status: "warning"
      });
      return;
    }
    setEditingItem(null);
    setFormMode("create");
    setFormOpen(true);
  };

  const handleEditTile = (item: ParishHubAdminItem) => {
    setEditingItem(item);
    setFormMode("edit");
    setFormOpen(true);
  };

  const handleDeleteTile = (item: ParishHubAdminItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleFormSubmit = (data: ParishHubItemFormData) => {
    startTransition(async () => {
      try {
        if (formMode === "create") {
          const newItem = await createParishHubItem({
            parishId,
            actorUserId: userId,
            label: data.label,
            icon: data.icon,
            targetType: data.targetType,
            targetUrl: data.targetType === "EXTERNAL" ? data.targetUrl : null,
            internalRoute: data.targetType === "INTERNAL" ? data.internalRoute : null,
            visibility: data.visibility,
            enabled: data.enabled
          });
          setItems((prev) => [
            ...prev,
            {
              ...newItem,
              targetUrl: newItem.targetUrl ?? null,
              internalRoute: newItem.internalRoute ?? null
            } as ParishHubAdminItem
          ]);
          addToast({ title: "Tile added successfully", status: "success" });
        } else if (editingItem) {
          const updatedItem = await updateParishHubItem({
            parishId,
            actorUserId: userId,
            itemId: editingItem.id,
            label: data.label,
            icon: data.icon,
            targetType: data.targetType,
            targetUrl: data.targetType === "EXTERNAL" ? data.targetUrl : null,
            internalRoute: data.targetType === "INTERNAL" ? data.internalRoute : null,
            visibility: data.visibility,
            enabled: data.enabled
          });
          setItems((prev) =>
            prev.map((item) =>
              item.id === editingItem.id
                ? ({
                    ...updatedItem,
                    targetUrl: updatedItem.targetUrl ?? null,
                    internalRoute: updatedItem.internalRoute ?? null
                  } as ParishHubAdminItem)
                : item
            )
          );
          addToast({ title: "Tile updated successfully", status: "success" });
        }
        setFormOpen(false);
      } catch (error) {
        addToast({
          title: formMode === "create" ? "Failed to add tile" : "Failed to update tile",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    startTransition(async () => {
      try {
        await deleteParishHubItem({
          parishId,
          actorUserId: userId,
          itemId: itemToDelete.id
        });
        setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
        addToast({ title: "Tile deleted", status: "success" });
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
      } catch (error) {
        addToast({
          title: "Failed to delete tile",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  const handleReorder = (newOrder: Array<{ itemId: string; order: number }>) => {
    // Optimistic update
    const orderMap = new Map(newOrder.map((o) => [o.itemId, o.order]));
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        order: orderMap.get(item.id) ?? item.order
      }))
    );

    startTransition(async () => {
      try {
        await reorderParishHubItems({
          parishId,
          actorUserId: userId,
          items: newOrder
        });
        addToast({ title: "Tiles reordered", status: "success" });
      } catch (error) {
        // Revert on error
        setItems(initialItems);
        addToast({
          title: "Failed to reorder tiles",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  const formInitialData: ParishHubItemFormData | undefined = editingItem
    ? {
        id: editingItem.id,
        label: editingItem.label,
        icon: editingItem.icon,
        targetType: editingItem.targetType,
        targetUrl: editingItem.targetUrl ?? "",
        internalRoute: editingItem.internalRoute ?? "",
        visibility: editingItem.visibility,
        enabled: editingItem.enabled
      }
    : undefined;

  const deleteConfirmContent = (
    <p className="text-sm text-ink-700">
      Are you sure you want to delete{" "}
      <span className="font-semibold">{itemToDelete?.label}</span>? This action cannot be
      undone.
    </p>
  );

  const deleteConfirmFooter = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button type="button" variant="danger" onClick={handleConfirmDelete} isLoading={isPending}>
        Delete
      </Button>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Settings toggles */}
      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink-900">Parish Hub Settings</p>
          <p className="text-xs text-ink-500">Configure the parish hub grid display.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mist-200 bg-mist-50/60 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-ink-700">Enable Parish Hub</p>
            <p className="text-xs text-ink-500">Show the hub grid on the /parish page.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hubGridEnabled}
            aria-label="Toggle parish hub"
            onClick={handleToggleHubGrid}
            disabled={isPending || (!hubGridEnabled && !canEnableGrid)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full border transition focus-ring disabled:cursor-not-allowed disabled:opacity-60",
              hubGridEnabled ? "border-primary-500 bg-primary-500" : "border-mist-200 bg-mist-200"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition",
                hubGridEnabled ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mist-200 bg-mist-50/60 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-ink-700">Public Visibility</p>
            <p className="text-xs text-ink-500">Allow non-logged-in visitors to see the hub.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hubGridPublicEnabled}
            aria-label="Toggle public visibility"
            onClick={handleTogglePublicVisibility}
            disabled={isPending}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full border transition focus-ring disabled:cursor-not-allowed disabled:opacity-60",
              hubGridPublicEnabled
                ? "border-primary-500 bg-primary-500"
                : "border-mist-200 bg-mist-200"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition",
                hubGridPublicEnabled ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {/* Validation messages */}
        {validationMessages.length > 0 && (
          <div className="space-y-1">
            {validationMessages.map((message, index) => (
              <p key={index} className="text-xs text-amber-600">
                {message}
              </p>
            ))}
          </div>
        )}
      </Card>

      {/* Tiles management */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Hub Tiles</p>
            <p className="text-xs text-ink-500">
              {totalCount} of {MAX_TOTAL_TILES} tiles ({enabledCount} enabled)
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleAddTile}
            disabled={!canAddMore || isPending}
          >
            <PlusIcon className="h-4 w-4" />
            Add Tile
          </Button>
        </div>

        <ParishHubReorderList
          items={items}
          onReorder={handleReorder}
          onEdit={handleEditTile}
          onDelete={handleDeleteTile}
          minEnabledCount={MIN_ENABLED_TILES}
        />
      </Card>

      {/* Add/Edit Form */}
      <ParishHubItemForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={formInitialData}
        isLoading={isPending}
        mode={formMode}
      />

      {/* Delete Confirmation */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        title="Delete Tile"
        footer={deleteConfirmFooter}
      >
        {deleteConfirmContent}
      </Modal>
      <Drawer
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        title="Delete Tile"
        footer={deleteConfirmFooter}
      >
        {deleteConfirmContent}
      </Drawer>
    </div>
  );
}
