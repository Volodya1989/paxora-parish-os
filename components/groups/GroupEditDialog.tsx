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
import AvatarUploadField from "@/components/shared/AvatarUploadField";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";
import { useTranslations } from "@/lib/i18n/provider";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 280;

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
    avatarUrl?: string | null;
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
  const t = useTranslations();
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

  const visibilityOptions = [
    { value: "PUBLIC", label: t("groupEdit.publicDesc") },
    { value: "PRIVATE", label: t("groupEdit.privateDesc") }
  ];
  const joinPolicyOptions = [
    { value: "INVITE_ONLY", label: t("groupEdit.inviteOnly") },
    { value: "OPEN", label: t("groupEdit.openJoin") },
    { value: "REQUEST_TO_JOIN", label: t("groupEdit.requestToJoin") }
  ];

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
      setError(t("groupEdit.nameRequired"));
      return;
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      setError(t("groupEdit.nameTooLong", { max: String(NAME_MAX_LENGTH) }));
      return;
    }

    if (trimmedDescription && trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      setError(t("groupEdit.descriptionTooLong", { max: String(DESCRIPTION_MAX_LENGTH) }));
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
          title: t("groupEdit.toastUpdatedTitle"),
          description: t("groupEdit.toastUpdatedDescription"),
          status: "success"
        });
        onOpenChange(false);
        onUpdated?.();
      } catch (submitError) {
        setError(t("groupEdit.errorGeneric"));
        addToast({
          title: t("groupEdit.toastErrorTitle"),
          description: t("groupEdit.toastErrorDescription"),
          status: "error"
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
      <AvatarUploadField
        label={t("groupEdit.photoLabel")}
        currentUrl={group.avatarUrl ?? null}
        fallbackText={group.name}
        uploadEndpoint={`/api/groups/${group.id}/avatar`}
        deleteEndpoint={`/api/groups/${group.id}/avatar`}
        onUpdated={() => onUpdated?.()}
      />

      <div className="space-y-2">
        <Label htmlFor={nameId}>{t("groupEdit.groupName")}</Label>
        <Input
          id={nameId}
          name="name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder={t("groupEdit.groupNamePlaceholder")}
          maxLength={NAME_MAX_LENGTH}
          aria-invalid={Boolean(error) || undefined}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={descriptionId}>{t("groupEdit.descriptionOptional")}</Label>
        <Textarea
          id={descriptionId}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          placeholder={t("groupEdit.descriptionPlaceholder")}
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={visibilityId}>{t("groupEdit.visibility")}</Label>
        <SelectMenu
          id={visibilityId}
          name="visibility"
          value={visibility}
          onValueChange={(value) => setVisibility(value as "PUBLIC" | "PRIVATE")}
          options={visibilityOptions}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={joinPolicyId}>{t("groupEdit.joinSettings")}</Label>
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
        {t("buttons.cancel")}
      </Button>
      <Button type="submit" form={formId} isLoading={isPending}>
        {t("groupEdit.saveChanges")}
      </Button>
    </>
  );

  const modalFormId = useId();
  const drawerFormId = useId();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const formDescription = (
    <p className="mb-4 text-sm text-ink-500">
      {t("groupEdit.dialogDescription")}
    </p>
  );

  if (isDesktop) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title={t("groupEdit.dialogTitle")}
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
      title={t("groupEdit.dialogTitle")}
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
