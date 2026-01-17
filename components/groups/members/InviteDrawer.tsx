"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import type { MemberActionState } from "@/app/actions/members";

const roleOptions = [
  { value: "MEMBER", label: "Parishioner" },
  { value: "LEAD", label: "Coordinator" }
];

type InviteDrawerProps = {
  open: boolean;
  onClose: () => void;
  onInvite: (input: { email: string; role: "LEAD" | "MEMBER" }) => Promise<MemberActionState>;
};

export default function InviteDrawer({ open, onClose, onInvite }: InviteDrawerProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"LEAD" | "MEMBER">("MEMBER");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!email.trim()) {
      addToast({
        title: "Email required",
        description: "Enter an email address to send an invite."
      });
      return;
    }

    startTransition(async () => {
      const result = await onInvite({ email: email.trim(), role });
      if (result.status === "error") {
        addToast({
          title: "Invite failed",
          description: result.message
        });
        return;
      }

      addToast({
        title: "Invite sent",
        description: "We let them know how to join the group."
      });
      setEmail("");
      setRole("MEMBER");
      onClose();
      router.refresh();
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Invite a parishioner"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} isLoading={isPending}>
            Send invite
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-500">
        Send a calm invitation to join this ministry group.
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <SelectMenu
            id="invite-role"
            name="role"
            value={role}
            onValueChange={(value) => setRole(value as "LEAD" | "MEMBER")}
            options={roleOptions}
          />
        </div>
      </div>
    </Drawer>
  );
}
