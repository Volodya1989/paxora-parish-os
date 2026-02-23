"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [isManaging, setIsManaging] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  useEffect(() => {
    if (!open) {
      setIsAdding(false);
      setIsManaging(false);
      setEditingTagId(null);
      setEditingTagName("");
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

  const selectedTagIds = useMemo(() => new Set(task?.userTags.map((tag) => tag.id) ?? []), [task]);

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
      setTags((prev) => {
        const without = prev.filter((item) => item.id !== created.id);
        return [...without, created].sort((a, b) => a.name.localeCompare(b.name));
      });
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

  const startEdit = (tag: UserTagItem) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  };

  const handleRename = async () => {
    if (!editingTagId) return;
    const candidate = editingTagName.trim();
    if (!candidate) return;
    setIsBusy(true);
    try {
      const updated = await renameUserTag({ id: editingTagId, name: candidate });
      setTags((prev) =>
        prev
          .map((tag) => (tag.id === updated.id ? updated : tag))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingTagId(null);
      setEditingTagName("");
      onApplied();
    } catch {
      addToast({ title: t("tasks.tags.toasts.renameFailed"), status: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    setIsBusy(true);
    try {
      await deleteUserTag({ id: tagId });
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      if (editingTagId === tagId) {
        setEditingTagId(null);
        setEditingTagName("");
      }
      onApplied();
    } catch {
      addToast({ title: t("tasks.tags.toasts.deleteFailed"), status: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-600">{t("tasks.tags.description")}</p>
        <button
          type="button"
          onClick={() => setIsManaging((prev) => !prev)}
          className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-600"
        >
          {isManaging ? t("tasks.tags.doneManaging") : t("tasks.tags.manage")}
        </button>
      </div>

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
            <Button type="button" size="sm" onClick={() => void handleCreate()} isLoading={isBusy}>
              {t("tasks.tags.add")}
            </Button>
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

      <div className="flex flex-wrap gap-2">
        {isLoading ? <p className="text-xs text-ink-500">{t("tasks.tags.loading")}</p> : null}
        {!isLoading && tags.length === 0 ? <p className="text-xs text-ink-500">{t("tasks.tags.empty")}</p> : null}
        {tags.map((tag) => {
          const selected = selectedTagIds.has(tag.id);
          return (
            <button
              key={tag.id}
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
          );
        })}
      </div>

      {isManaging && tags.length > 0 ? (
        <div className="space-y-2 rounded-card border border-mist-200 bg-mist-50/60 p-3">
          {tags.map((tag) => {
            const isEditing = editingTagId === tag.id;
            return (
              <div key={tag.id} className="flex items-center gap-2">
                {isEditing ? (
                  <input
                    value={editingTagName}
                    onChange={(event) => setEditingTagName(event.target.value)}
                    className="h-8 flex-1 rounded-full border border-mist-200 px-3 text-xs"
                  />
                ) : (
                  <span className="flex-1 text-xs font-medium text-ink-700">{tag.name}</span>
                )}
                {isEditing ? (
                  <>
                    <Button type="button" size="sm" onClick={() => void handleRename()} isLoading={isBusy}>
                      {t("tasks.tags.save")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingTagId(null);
                        setEditingTagName("");
                      }}
                    >
                      {t("buttons.cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(tag)}>
                      {t("tasks.tags.edit")}
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => void handleDelete(tag.id)} isLoading={isBusy}>
                      {t("tasks.tags.delete")}
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  if (isDesktop) {
    return (
      <Modal open={open} onClose={() => onOpenChange(false)} title={t("tasks.tags.title")}>
        {content}
      </Modal>
    );
  }

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title={t("tasks.tags.title")}>
      {content}
    </Drawer>
  );
}
