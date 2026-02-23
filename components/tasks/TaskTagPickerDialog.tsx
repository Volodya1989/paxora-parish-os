"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";
import { useToast } from "@/components/ui/Toast";
import type { TaskListItem } from "@/lib/queries/tasks";
import {
  createUserTag,
  listUserTags,
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [tags, setTags] = useState<UserTagItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setIsLoading(true);
    void listUserTags()
      .then((items) => setTags(items))
      .catch(() => {
        addToast({ title: "Couldn't load tags", status: "error" });
      })
      .finally(() => setIsLoading(false));
  }, [addToast, open]);

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
    } catch (error) {
      addToast({ title: "Couldn't update tags", status: "error" });
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
    } catch (error) {
      addToast({ title: "Couldn't create tag", status: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const content = (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">Organize this private task with personal tags.</p>
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
              placeholder="Tag name"
              className="h-9 flex-1 rounded-full border border-mist-200 px-3 text-sm"
            />
            <Button type="button" size="sm" onClick={() => void handleCreate()} isLoading={isBusy}>Add</Button>
          </div>
        ) : (
          <button
            type="button"
            className="rounded-full border border-dashed border-mist-300 px-3 py-1.5 text-xs font-semibold text-ink-600"
            onClick={() => setIsAdding(true)}
          >
            + New tag
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {isLoading ? <p className="text-xs text-ink-500">Loading…</p> : null}
        {!isLoading && tags.length === 0 ? <p className="text-xs text-ink-500">No tags yet.</p> : null}
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
    </div>
  );

  if (isDesktop) {
    return (
      <Modal open={open} onClose={() => onOpenChange(false)} title="Task tags">
        {content}
      </Modal>
    );
  }

  return (
    <Drawer open={open} onClose={() => onOpenChange(false)} title="Task tags">
      {content}
    </Drawer>
  );
}
