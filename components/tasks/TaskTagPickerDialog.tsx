"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/lib/i18n/provider";
import type { TaskListItem } from "@/lib/queries/tasks";
import {
  createUserTag,
  deleteUserTag,
  listUserTags,
  renameUserTag,
  updatePrivateTaskTags,
  type UserTagItem
} from "@/server/actions/tasks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskListItem | null;
  onApplied: () => void;
};

export default function TaskTagPickerDialog({ open, onOpenChange, task, onApplied }: Props) {
  const { addToast } = useToast();
  const t = useTranslations();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [tags, setTags] = useState<UserTagItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserTagItem | null>(null);


  useEffect(() => {
    if (!open) {
      return;
    }
    setIsLoading(true);
    void listUserTags()
      .then((items) => setTags(items))
      .catch(() => {
        addToast({ title: t("tasks.tags.toasts.loadFailed"), status: "error" });
      })
      .finally(() => setIsLoading(false));
  }, [addToast, open, t]);

  const selectedTagIds = new Set(task?.userTags.map((tag) => tag.id) ?? []);

  const toggleTag = async (tagId: string) => {
    if (!task) return;
    const isSelected = selectedTagIds.has(tagId);
    setIsBusy(true);
    try {
      await updatePrivateTaskTags({
        taskId: task.id,
        addTagIds: isSelected ? [] : [tagId],
        removeTagIds: isSelected ? [tagId] : []
      });
      onApplied();
      if (!isSelected) {
        onOpenChange(false);
      }
    } catch {
      addToast({ title: t("tasks.tags.toasts.updateFailed"), status: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!task) return;
    const candidate = newTagName.trim();
    if (!candidate) return;
    setIsBusy(true);
    try {
      const created = await createUserTag({ name: candidate });
      setTags((prev) => (prev.some((item) => item.id === created.id) ? prev : [...prev, created]));
      await updatePrivateTaskTags({ taskId: task.id, addTagIds: [created.id] });
      setNewTagName("");
      setIsAdding(false);
      onApplied();
    } catch {
      addToast({ title: t("tasks.tags.toasts.createFailed"), status: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRename = async (tagId: string) => {
    const nextName = editingTagName.trim();
    if (!nextName) return;
    setIsBusy(true);
    try {
      const updated = await renameUserTag({ id: tagId, name: nextName });
      setTags((prev) => prev.map((tag) => (tag.id === tagId ? updated : tag)));
      setEditingTagId(null);
      setEditingTagName("");
      onApplied();
    } catch {
      addToast({ title: t("tasks.tags.toasts.renameFailed"), status: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const tagId = deleteTarget.id;
    setIsBusy(true);
    try {
      await deleteUserTag({ id: tagId });
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      if (editingTagId === tagId) {
        setEditingTagId(null);
        setEditingTagName("");
      }
      setDeleteTarget(null);
      onApplied();
    } catch {
      addToast({ title: t("tasks.tags.toasts.deleteFailed"), status: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const content = (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">{t("tasks.tags.description")}</p>
      <div>
        {isAdding ? (
          <div className="flex gap-2">
            <input
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
              placeholder={t("tasks.tags.newPlaceholder")}
              className="h-9 flex-1 rounded-full border border-mist-200 px-3 text-sm"
            />
            <Button type="button" size="sm" onClick={() => void handleCreate()} isLoading={isBusy}>{t("tasks.tags.add")}</Button>
          </div>
        ) : (
          <button
            type="button"
            className="rounded-full border border-dashed border-mist-300 px-3 py-1.5 text-xs font-semibold text-ink-600"
            onClick={() => setIsAdding(true)}
          >
            {t("tasks.tags.new")}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {isLoading ? <p className="text-xs text-ink-500">{t("tasks.tags.loading")}</p> : null}
        {!isLoading && tags.length === 0 ? <p className="text-xs text-ink-500">{t("tasks.tags.empty")}</p> : null}
        {tags.map((tag) => {
          const selected = selectedTagIds.has(tag.id);
          const isEditing = editingTagId === tag.id;

          return (
            <div key={tag.id} className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void toggleTag(tag.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  selected
                    ? "border-primary-200 bg-primary-100 text-primary-800"
                    : "border-mist-200 bg-white text-ink-600 hover:bg-mist-50"
                }`}
              >
                {tag.name}
              </button>

              {isEditing ? (
                <>
                  <input
                    value={editingTagName}
                    onChange={(event) => setEditingTagName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleRename(tag.id);
                      }
                    }}
                    className="h-8 flex-1 rounded-full border border-mist-200 px-3 text-xs"
                  />
                  <Button type="button" size="sm" onClick={() => void handleRename(tag.id)} isLoading={isBusy}>
                    {t("tasks.tags.save")}
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-ink-500"
                    onClick={() => {
                      setEditingTagId(null);
                      setEditingTagName("");
                    }}
                  >
                    {t("tasks.tags.cancel")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    className="text-xs font-medium text-ink-500 hover:text-ink-700"
                    onClick={() => {
                      setEditingTagId(tag.id);
                      setEditingTagName(tag.name);
                    }}
                  >
                    {t("tasks.tags.rename")}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700"
                    onClick={() => setDeleteTarget(tag)}
                  >
                    {t("tasks.tags.delete")}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );


  const confirmDeleteContent = deleteTarget ? (
    <p className="text-sm text-ink-700">
      {t("tasks.tags.confirmDeleteBody", { name: deleteTarget.name })}
    </p>
  ) : null;

  const confirmDeleteFooter = (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isBusy}>
        {t("tasks.tags.cancel")}
      </Button>
      <Button type="button" variant="danger" onClick={() => void handleDeleteConfirm()} isLoading={isBusy}>
        {t("tasks.tags.delete")}
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <>
        <Modal open={open} onClose={() => onOpenChange(false)} title={t("tasks.tags.title")}>
          {content}
        </Modal>
        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title={t("tasks.tags.confirmDeleteTitle")}
          footer={confirmDeleteFooter}
        >
          {confirmDeleteContent}
        </Modal>
      </>
    );
  }

  return (
    <>
      <Drawer open={open} onClose={() => onOpenChange(false)} title={t("tasks.tags.title")}>
        {content}
      </Drawer>
      <Drawer
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("tasks.tags.confirmDeleteTitle")}
        footer={confirmDeleteFooter}
      >
        {confirmDeleteContent}
      </Drawer>
    </>
  );
}
