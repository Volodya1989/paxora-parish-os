"use client";

import { useCallback, useEffect, useId, useState, useTransition, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import Textarea from "@/components/ui/Textarea";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { updateGroup } from "@/server/actions/groups";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 280;
const visibilityOptions = [
  { value: "PUBLIC", label: "Public · Anyone in the parish can see this group" },
  { value: "PRIVATE", label: "Private · Only members can see this group" }
];
const joinPolicyOptions = [
  { value: "INVITE_ONLY", label: "Invite only" },
  { value: "OPEN", label: "Anyone can join instantly" },
  { value: "REQUEST_TO_JOIN", label: "Request approval to join" }
];

type GroupEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parishId: string;
  actorUserId: string;
  group: {
    id: string;
    name: string;
    description?: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    joinPolicy: "INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN";
  };
  onUpdated?: () => void;
};

export default function GroupEditDialog({
  open,
  onOpenChange,
  parishId,
  actorUserId,
  group,
  onUpdated
}: GroupEditDialogProps) {
  const { addToast } = useToast();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(group.visibility);
  const [joinPolicy, setJoinPolicy] = useState<"INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN">(
    group.joinPolicy
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const modalNameId = useId();
  const modalDescriptionId = useId();
  const modalVisibilityId = useId();
  const modalJoinPolicyId = useId();
  const drawerNameId = useId();
  const drawerDescriptionId = useId();
  const drawerVisibilityId = useId();
  const drawerJoinPolicyId = useId();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(group.name);
    setDescription(group.description ?? "");
    setVisibility(group.visibility);
    setJoinPolicy(group.joinPolicy);
    setError(null);
  }, [group, open]);

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
        await updateGroup({
          parishId,
          actorUserId,
          groupId: group.id,
          name: trimmedName,
          description: trimmedDescription || undefined,
          visibility,
          joinPolicy
        });
        addToast({
          title: "Group updated",
          description: "Your changes are live."
        });
        onOpenChange(false);
        onUpdated?.();
      } catch (submitError) {
        setError("We couldn't update that group. Please try again.");
        addToast({
          title: "Unable to save",
          description: "Please check the details and try again."
        });
      }
    });
  };

  const renderForm = (
    formId: string,
    nameId: string,
    descriptionId: string,
    visibilityId: string,
    joinPolicyId: string
  ) => (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor={nameId}>Group name</Label>
        <Input
          id={nameId}
          name="name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
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
          onChange={(event) => setDescription(event.currentTarget.value)}
          placeholder="Share what this group is responsible for."
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={visibilityId}>Visibility</Label>
        <SelectMenu
          id={visibilityId}
          name="visibility"
          value={visibility}
          onValueChange={(value) => setVisibility(value as "PUBLIC" | "PRIVATE")}
          options={visibilityOptions}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={joinPolicyId}>Join settings</Label>
        <SelectMenu
          id={joinPolicyId}
          name="joinPolicy"
          value={joinPolicy}
          onValueChange={(value) =>
            setJoinPolicy(value as "INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN")
          }
          options={joinPolicyOptions}
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
        Save changes
      </Button>
    </>
  );

  const modalFormId = useId();
  const drawerFormId = useId();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const formDescription = (
    <p className="mb-4 text-sm text-ink-500">
      Update details so members know how to connect and contribute.
    </p>
  );

  if (isDesktop) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Edit group"
        footer={renderFooter(modalFormId)}
      >
        {formDescription}
        {renderForm(
          modalFormId,
          modalNameId,
          modalDescriptionId,
          modalVisibilityId,
          modalJoinPolicyId
        )}
      </Modal>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="Edit group"
      footer={renderFooter(drawerFormId)}
    >
      {formDescription}
      {renderForm(
        drawerFormId,
        drawerNameId,
        drawerDescriptionId,
        drawerVisibilityId,
        drawerJoinPolicyId
      )}
    </Drawer>
  );
}
