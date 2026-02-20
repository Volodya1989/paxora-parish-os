"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import Card, { CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { deleteOwnAccount } from "@/app/actions/account";

export default function DeleteAccountCard() {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

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
    <Card>
      <CardHeader>
        <CardTitle>Delete account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-500">
          This action is permanent. You will immediately lose access, and your historical content
          remains but will be attributed to Deleted User.
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
