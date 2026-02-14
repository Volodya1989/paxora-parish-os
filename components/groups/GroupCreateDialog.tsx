"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { submitGroupCreationRequest } from "@/server/actions/groups";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";
import RequestSuccessState from "@/components/shared/RequestSuccessState";
import type { GroupInviteCandidate } from "@/lib/queries/groups";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 280;
const visibilityOptions = [
  { value: "PUBLIC", label: "Visible to all · Listed in parish groups" },
  { value: "PRIVATE", label: "Hidden · Invite-only visibility" }
];
const joinPolicyOptions = [
  { value: "INVITE_ONLY", label: "Invite only" },
  { value: "OPEN", label: "Anyone can join instantly" },
  { value: "REQUEST_TO_JOIN", label: "Request approval to join" }
];

type GroupCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parishId: string;
  actorUserId: string;
  inviteCandidates: GroupInviteCandidate[];
  isRequest?: boolean;
  onCreated?: () => void;
};

export default function GroupCreateDialog({
  open,
  onOpenChange,
  parishId,
  actorUserId,
  inviteCandidates,
  isRequest = false,
  onCreated
}: GroupCreateDialogProps) {
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [joinPolicy, setJoinPolicy] = useState<"INVITE_ONLY" | "OPEN" | "REQUEST_TO_JOIN">(
    "INVITE_ONLY"
  );
  const [inviteQuery, setInviteQuery] = useState("");
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<string[]>([]);
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
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

  const selectedInvitees = useMemo(() => {
    const selectedSet = new Set(selectedInviteeIds);
    return inviteCandidates.filter((candidate) => selectedSet.has(candidate.id));
  }, [inviteCandidates, selectedInviteeIds]);

  const filteredCandidates = useMemo(() => {
    const selectedSet = new Set(selectedInviteeIds);
    const normalizedQuery = inviteQuery.trim().toLowerCase();

    return inviteCandidates.filter((candidate) => {
      if (selectedSet.has(candidate.id)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return `${candidate.name} ${candidate.email}`.toLowerCase().includes(normalizedQuery);
    });
  }, [inviteCandidates, inviteQuery, selectedInviteeIds]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setVisibility("PUBLIC");
    setJoinPolicy("INVITE_ONLY");
    setInviteQuery("");
    setSelectedInviteeIds([]);
    setShowInvitePicker(false);
    setError(null);
    setSubmitted(false);
    setAvatarFile(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const toggleInvitee = (userId: string) => {
    setSelectedInviteeIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

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
        const result = await submitGroupCreationRequest({
          parishId,
          actorUserId,
          name: trimmedName,
          description: trimmedDescription || undefined,
          visibility,
          joinPolicy,
          inviteeUserIds: selectedInviteeIds
        });
        if (result.status === "error") {
          setError(result.message ?? "Unable to submit group request.");
          addToast({
            title: isRequest ? "Unable to submit request" : "Unable to create group",
            description: result.message ?? "Please try again.",
            status: "error"
          });
          return;
        }

        if (isRequest) {
          setSubmitted(true);
          onCreated?.();
          return;
        }

        if (avatarFile && result.groupId) {
          const formData = new FormData();
          formData.append("file", avatarFile);
          const avatarResponse = await fetch(`/api/groups/${result.groupId}/avatar`, {
            method: "POST",
            body: formData
          });
          if (!avatarResponse.ok) {
            throw new Error("Group created, but photo upload failed.");
          }
        }

        addToast({
          title: isRequest ? "Request submitted" : "Group created",
          description: isRequest
            ? "Your request is pending approval from parish leadership."
            : "Your new group is ready for members and opportunities to help.",
          status: "success"
        });
        resetForm();
        onOpenChange(false);
        onCreated?.();
      } catch (submitError) {
        const message =
          submitError instanceof Error && submitError.message
            ? submitError.message
            : isRequest
              ? "We couldn't submit that request. Please try again."
              : "We couldn't create that group. Please try again.";
        setError(message);
        addToast({
          title: isRequest ? "Unable to submit request" : "Unable to create group",
          description: message,
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
    submitted ? (
      <RequestSuccessState
        message="Your request is pending approval from parish leadership."
        onDone={() => {
          resetForm();
          onOpenChange(false);
        }}
      />
    ) : (
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
          <Label>Group photo (optional)</Label>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => avatarInputRef.current?.click()}>
              {avatarFile ? "Change photo" : "Upload photo"}
            </Button>
            {avatarFile ? <span className="text-xs text-ink-500">{avatarFile.name}</span> : null}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => setAvatarFile(event.currentTarget.files?.[0] ?? null)}
            />
          </div>
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
          <Label htmlFor={visibilityId}>Discoverability</Label>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Invite members</Label>
            <Button
              type="button"
              size="sm"
              variant={showInvitePicker ? "ghost" : "secondary"}
              onClick={() => setShowInvitePicker((current) => !current)}
            >
              {showInvitePicker
                ? "Done"
                : selectedInvitees.length > 0
                  ? `Add members (${selectedInvitees.length})`
                  : "Add members"}
            </Button>
          </div>

          {selectedInvitees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedInvitees.map((invitee) => (
                <Badge key={invitee.id} tone="neutral">
                  <span className="mr-1">{invitee.name}</span>
                  <button
                    type="button"
                    className="text-ink-500 hover:text-ink-900"
                    onClick={() => toggleInvitee(invitee.id)}
                    aria-label={`Remove ${invitee.name}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}

          {showInvitePicker ? (
            <>
              <Input
                id={`${formId}-invite-search`}
                value={inviteQuery}
                onChange={(event) => setInviteQuery(event.currentTarget.value)}
                placeholder="Search by name or email"
              />
              <div className="max-h-44 overflow-y-auto rounded-xl border border-mist-200 bg-white">
                {filteredCandidates.slice(0, 30).map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-mist-50"
                    onClick={() => toggleInvitee(candidate.id)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink-900">{candidate.name}</span>
                      <span className="block truncate text-xs text-ink-500">{candidate.email}</span>
                    </span>
                    <span className="ml-3 text-xs text-primary-600">Add</span>
                  </button>
                ))}
                {filteredCandidates.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-ink-500">No matching parish members.</p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        ) : null}
      </form>
    )
  );

  const renderFooter = (formId: string) => (
    submitted ? null : <>
      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button type="submit" form={formId} isLoading={isPending}>
        {isRequest ? "Send request" : "Create group"}
      </Button>
    </>
  );

  const modalFormId = useId();
  const drawerFormId = useId();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const formDescription = (
    <p className="mb-4 text-sm text-ink-500">
      {isRequest
        ? "Tell us about the group you want to start. A parish leader will review it."
        : "Gather the right people around a mission, ministry, or project."}
    </p>
  );

  if (isDesktop) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title={isRequest ? "Request a new group" : "New group"}
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
      title={isRequest ? "Request a new group" : "New group"}
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
