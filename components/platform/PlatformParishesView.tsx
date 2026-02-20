"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import ListEmptyState from "@/components/app/list-empty-state";
import type { PlatformParishRecord } from "@/lib/queries/platformParishes";
import { locales } from "@/lib/i18n/config";
import {
  createPlatformParish,
  deactivatePlatformParish,
  reactivatePlatformParish,
  safeDeletePlatformParish,
  updatePlatformParish
} from "@/app/actions/platformParishes";
import { startImpersonation } from "@/app/actions/platformImpersonation";
import type { PlatformParishActionState } from "@/lib/types/platformParishes";

type PlatformParishesViewProps = {
  parishes: PlatformParishRecord[];
  impersonatedParishId?: string | null;
};

type ParishFormState = {
  name: string;
  address: string;
  timezone: string;
  logoUrl: string;
  defaultLocale: string;
};

type ConfirmState =
  | { action: "deactivate"; parishId: string; parishName: string }
  | { action: "reactivate"; parishId: string; parishName: string }
  | { action: "delete"; parishId: string; parishName: string }
  | null;

const emptyForm: ParishFormState = {
  name: "",
  address: "",
  timezone: "UTC",
  logoUrl: "",
  defaultLocale: locales[0]
};

export default function PlatformParishesView({
  parishes,
  impersonatedParishId
}: PlatformParishesViewProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingParish, setEditingParish] = useState<PlatformParishRecord | null>(null);
  const [formState, setFormState] = useState<ParishFormState>(emptyForm);
  const [isPending, startTransition] = useTransition();
  const [isImpersonating, startImpersonationTransition] = useTransition();
  const [busyParishId, setBusyParishId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const sortedParishes = useMemo(() => parishes, [parishes]);

  const openCreate = () => {
    setFormState(emptyForm);
    setEditingParish(null);
    setCreateOpen(true);
  };

  const openEdit = (parish: PlatformParishRecord) => {
    setFormState({
      name: parish.name,
      address: parish.address ?? "",
      timezone: parish.timezone,
      logoUrl: parish.logoUrl ?? "",
      defaultLocale: parish.defaultLocale
    });
    setCreateOpen(false);
    setEditingParish(parish);
  };

  const closeForm = () => {
    setCreateOpen(false);
    setEditingParish(null);
  };

  const handleChange = (field: keyof ParishFormState) => (value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleResult = (result: PlatformParishActionState, successTitle: string) => {
    if (result.status === "error") {
      addToast({
        title: "Update failed",
        description: result.message,
        status: "error"
      });
      return;
    }
    addToast({
      title: successTitle,
      description: result.inviteCode
        ? `${result.message} Parish Code: ${result.inviteCode}`
        : result.message,
      status: "success"
    });
    router.refresh();
    closeForm();
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const actionResult = editingParish
        ? await updatePlatformParish({ parishId: editingParish.id, ...formState })
        : await createPlatformParish(formState);
      handleResult(actionResult, editingParish ? "Parish updated" : "Parish created");
    });
  };

  const handleImpersonate = (parishId: string, parishName: string) => {
    startImpersonationTransition(async () => {
      const result = await startImpersonation(parishId);
      if (result.status === "error") {
        addToast({
          title: "Unable to impersonate",
          description: result.message,
          status: "error"
        });
        return;
      }
      addToast({
        title: "Impersonation started",
        description: `You are now viewing ${parishName}.`,
        status: "success"
      });
      router.refresh();
    });
  };

  const handleCopyInviteCode = async (inviteCode: string) => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      addToast({
        title: "Parish code copied",
        description: `${inviteCode} copied to clipboard.`,
        status: "success"
      });
    } catch {
      addToast({
        title: "Copy failed",
        description: "Unable to copy parish code.",
        status: "error"
      });
    }
  };

  // Open the appropriate confirmation dialog instead of using window.confirm.
  const handleDeactivate = (parishId: string, parishName: string) => {
    setConfirmState({ action: "deactivate", parishId, parishName });
  };

  const handleReactivate = (parishId: string, parishName: string) => {
    setConfirmState({ action: "reactivate", parishId, parishName });
  };

  const handleSafeDelete = (parishId: string, parishName: string) => {
    setConfirmState({ action: "delete", parishId, parishName });
  };

  const cancelConfirm = () => setConfirmState(null);

  const executeConfirm = () => {
    if (!confirmState) return;
    const { action, parishId } = confirmState;
    setConfirmState(null);
    setBusyParishId(parishId);
    startTransition(async () => {
      const result =
        action === "deactivate"
          ? await deactivatePlatformParish({ parishId })
          : action === "reactivate"
            ? await reactivatePlatformParish({ parishId })
            : await safeDeletePlatformParish({ parishId });
      handleResult(result, "Parish updated");
      setBusyParishId(null);
    });
  };

  // Confirmation dialog content varies by action.
  const confirmTitle =
    confirmState?.action === "deactivate"
      ? "Deactivate parish?"
      : confirmState?.action === "reactivate"
        ? "Reactivate parish?"
        : "Safely delete parish?";
  const confirmBodyText =
    confirmState?.action === "deactivate"
      ? `Deactivating "${confirmState.parishName}" will prevent parishioners from accessing it. You can safely delete it afterward once all data has been removed.`
      : confirmState?.action === "reactivate"
        ? `"${confirmState.parishName}" will be restored to active status. Parishioners will be able to access it again using the existing parish code.`
        : `"${confirmState?.parishName}" will be permanently deleted. This only succeeds after deactivation and when no dependent data remains. This cannot be undone.`;
  const confirmButtonLabel =
    confirmState?.action === "deactivate"
      ? "Deactivate"
      : confirmState?.action === "reactivate"
        ? "Reactivate"
        : "Delete";

  const confirmFooter = (
    <>
      <Button type="button" variant="secondary" onClick={cancelConfirm}>
        Cancel
      </Button>
      <Button type="button" onClick={executeConfirm} isLoading={isPending}>
        {confirmButtonLabel}
      </Button>
    </>
  );

  const confirmContent = (
    <p className="text-sm text-ink-700">{confirmBodyText}</p>
  );

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="parish-name">Parish name</Label>
        <Input
          id="parish-name"
          value={formState.name}
          onChange={(event) => handleChange("name")(event.target.value)}
          placeholder="Holy Family Parish"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="parish-address">Address</Label>
        <Textarea
          id="parish-address"
          value={formState.address}
          onChange={(event) => handleChange("address")(event.target.value)}
          placeholder="123 Main St, City, State"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="parish-timezone">Timezone</Label>
        <Input
          id="parish-timezone"
          value={formState.timezone}
          onChange={(event) => handleChange("timezone")(event.target.value)}
          placeholder="America/New_York"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="parish-logo">Logo URL</Label>
        <Input
          id="parish-logo"
          value={formState.logoUrl}
          onChange={(event) => handleChange("logoUrl")(event.target.value)}
          placeholder="https://cdn.example.com/parish-logo.png"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="parish-locale">Default locale</Label>
        <Select
          id="parish-locale"
          value={formState.defaultLocale}
          onChange={(event) => handleChange("defaultLocale")(event.target.value)}
        >
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {locale.toUpperCase()}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );

  const formFooter = (
    <>
      <Button type="button" variant="secondary" onClick={closeForm}>
        Cancel
      </Button>
      <Button type="button" onClick={handleSubmit} isLoading={isPending}>
        {editingParish ? "Save changes" : "Create parish"}
      </Button>
    </>
  );

  const formOpen = isCreateOpen || Boolean(editingParish);
  const formTitle = editingParish ? "Edit parish" : "Create parish";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 overflow-x-hidden pb-2 md:space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900">Quick actions</p>
            <p className="text-sm text-ink-500">Create or edit parish spaces for platform operations.</p>
          </div>
          <Button type="button" onClick={openCreate}>
            Add parish
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All parishes</CardTitle>
          <CardDescription>
            {sortedParishes.length
              ? "Select a parish to edit details or impersonate."
              : "Create your first parish to get started."}
          </CardDescription>
        </CardHeader>
        <div className="space-y-3">
          {sortedParishes.length === 0 ? (
            <ListEmptyState
              title="No parishes yet"
              description="Add a parish to begin managing platform-level defaults."
              action={
                <Button type="button" variant="secondary" onClick={openCreate}>
                  Add parish
                </Button>
              }
            />
          ) : (
            sortedParishes.map((parish) => {
              const isImpersonated = parish.id === impersonatedParishId;
              const inviteCode = parish.inviteCode;
              const isDeactivated = Boolean(parish.deactivatedAt);
              const isBusy = busyParishId === parish.id;
              return (
                <div
                  key={parish.id}
                  className="flex flex-col gap-4 rounded-card border border-mist-200 bg-white p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <img
                        src={parish.logoUrl?.trim() || "/icon.png"}
                        alt={`${parish.name} logo`}
                        className="h-10 w-10 rounded-full border border-mist-200 bg-mist-50 object-cover"
                        onError={(event) => {
                          event.currentTarget.src = "/icon.png";
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900 sm:text-base">{parish.name}</p>
                        <p className="text-xs text-ink-500">Slug: {parish.slug}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge tone="neutral">{parish.defaultLocale.toUpperCase()}</Badge>
                      <Badge tone="neutral">{parish.timezone}</Badge>
                      {isDeactivated ? <Badge tone="warning">Deactivated</Badge> : null}
                      {isImpersonated ? <Badge tone="warning">Impersonating</Badge> : null}
                    </div>
                  </div>

                  <div className="text-sm text-ink-500">
                    <p>{parish.address || "No address set."}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                        Parish Code
                      </span>
                      <code className="rounded bg-mist-100 px-2 py-1 text-sm font-semibold text-ink-800">
                        {inviteCode ?? "Not set"}
                      </code>
                      {inviteCode ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyInviteCode(inviteCode)}
                        >
                          Copy
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(parish)}>
                      Edit
                    </Button>
                    {isDeactivated ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReactivate(parish.id, parish.name)}
                        disabled={isBusy}
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeactivate(parish.id, parish.name)}
                        disabled={isBusy}
                      >
                        Deactivate
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSafeDelete(parish.id, parish.name)}
                      disabled={isBusy || !isDeactivated}
                    >
                      Safe delete
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isImpersonated ? "secondary" : "primary"}
                      onClick={() => handleImpersonate(parish.id, parish.name)}
                      disabled={isImpersonating || isImpersonated}
                    >
                      {isImpersonated ? "Impersonating" : "Impersonate"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Create / Edit form — Drawer (mobile) + Modal (desktop) are responsive siblings */}
      <Drawer open={formOpen} onClose={closeForm} title={formTitle} footer={formFooter}>
        {formContent}
      </Drawer>
      <Modal open={formOpen} onClose={closeForm} title={formTitle} footer={formFooter}>
        {formContent}
      </Modal>

      {/* Confirmation dialog — replaces window.confirm for Deactivate and Safe delete */}
      <Drawer open={Boolean(confirmState)} onClose={cancelConfirm} title={confirmTitle} footer={confirmFooter}>
        {confirmContent}
      </Drawer>
      <Modal open={Boolean(confirmState)} onClose={cancelConfirm} title={confirmTitle} footer={confirmFooter}>
        {confirmContent}
      </Modal>
    </div>
  );
}
