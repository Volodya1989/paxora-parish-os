"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { signOut } from "next-auth/react";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { deleteOwnAccount } from "@/app/actions/account";
import { APP_STORE_PATHS, APP_STORE_SUPPORT_EMAIL } from "@/lib/mobile/appStoreMetadata";
import { buildLocalePathname, getLocaleFromParam } from "@/lib/i18n/routing";

export default function DeleteAccountCard() {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const params = useParams<{ locale?: string }>();
  const locale = getLocaleFromParam(params?.locale);
  const privacyPath = buildLocalePathname(locale, APP_STORE_PATHS.privacy);
  const supportPath = buildLocalePathname(locale, APP_STORE_PATHS.support);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteOwnAccount({ confirmation });
      if (result.status === "error") {
        addToast({ title: "Delete failed", description: result.message, status: "error" });
        return;
      }

      await signOut({ callbackUrl: "/sign-in" });
    });
  };

  return (
    <Card id="account-deletion">
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-500">
          Deleting your account is permanent and cannot be undone. Your profile and sign-in access are removed
          immediately.
        </p>
        <p className="text-sm text-ink-500">
          For parish continuity, historical records (events, tasks, and messages) remain but are reassigned to
          Deleted User.
        </p>
        <p className="text-sm text-ink-500">
          Need help? Email <a href={`mailto:${APP_STORE_SUPPORT_EMAIL}`}>{APP_STORE_SUPPORT_EMAIL}</a> or review our{" "}
          <Link href={privacyPath} className="underline">
            Privacy Policy
          </Link>{" "}
          or use our <Link href={supportPath} className="underline">Support page</Link>. We respond to deletion support requests within 7 calendar days.
        </p>
        <Button type="button" variant="danger" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      </CardContent>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete account"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={isPending}
              disabled={confirmation !== "DELETE"}
            >
              Delete account
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-500">Type DELETE to confirm this irreversible action.</p>
          <div className="space-y-2">
            <Label htmlFor="delete-account-confirmation">Confirmation</Label>
            <Input
              id="delete-account-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.currentTarget.value)}
              placeholder="DELETE"
            />
          </div>
        </div>
      </Modal>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Delete account"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              isLoading={isPending}
              disabled={confirmation !== "DELETE"}
            >
              Delete account
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-500">Type DELETE to confirm this irreversible action.</p>
          <div className="space-y-2">
            <Label htmlFor="delete-account-confirmation-drawer">Confirmation</Label>
            <Input
              id="delete-account-confirmation-drawer"
              value={confirmation}
              onChange={(event) => setConfirmation(event.currentTarget.value)}
              placeholder="DELETE"
            />
          </div>
        </div>
      </Drawer>
    </Card>
  );
}
