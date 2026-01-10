"use client";

import { useEffect, useId, useState, useTransition, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Textarea from "@/components/ui/Textarea";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createGroup } from "@/server/actions/groups";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 280;

type GroupCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parishId: string;
  actorUserId: string;
  onCreated?: () => void;
};

export default function GroupCreateDialog({
  open,
  onOpenChange,
  parishId,
  actorUserId,
  onCreated
}: GroupCreateDialogProps) {
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameId = useId();
  const descriptionId = useId();

  const resetForm = () => {
    setName("");
    setDescription("");
    setError(null);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Group name is required.");
      return;
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      setError(`Group name must be ${NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }

    if (trimmedDescription && trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      setError(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`);
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        await createGroup({
          parishId,
          actorUserId,
          name: trimmedName,
          description: trimmedDescription || undefined
        });
        addToast({
          title: "Group created",
          description: "Your new group is ready for members and tasks."
        });
        resetForm();
        onOpenChange(false);
        onCreated?.();
      } catch (submitError) {
        setError("We couldn't create that group. Please try again.");
        addToast({
          title: "Unable to create group",
          description: "Please check the details and try again."
        });
      }
    });
  };

  const renderForm = (formId: string) => (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor={nameId}>Group name</Label>
        <Input
          id={nameId}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Hospitality Team"
          maxLength={NAME_MAX_LENGTH}
          aria-invalid={Boolean(error) || undefined}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={descriptionId}>Description (optional)</Label>
        <Textarea
          id={descriptionId}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Share what this group is responsible for."
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={4}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </form>
  );

  const renderFooter = (formId: string) => (
    <>
      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button type="submit" form={formId} isLoading={isPending}>
        Create group
      </Button>
    </>
  );

  const modalFormId = useId();
  const drawerFormId = useId();

  return (
    <>
      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        title="New group"
        footer={renderFooter(modalFormId)}
      >
        <p className="mb-4 text-sm text-ink-500">
          Gather the right people around a mission, ministry, or project.
        </p>
        {renderForm(modalFormId)}
      </Modal>
      <Drawer
        open={open}
        onClose={() => onOpenChange(false)}
        title="New group"
        footer={renderFooter(drawerFormId)}
      >
        <p className="mb-4 text-sm text-ink-500">
          Gather the right people around a mission, ministry, or project.
        </p>
        {renderForm(drawerFormId)}
      </Drawer>
    </>
  );
}
