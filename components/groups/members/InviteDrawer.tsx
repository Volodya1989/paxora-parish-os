"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import type { MemberActionState } from "@/lib/types/members";

const roleOptions = [
  { value: "PARISHIONER", label: "Parishioner" },
  { value: "COORDINATOR", label: "Coordinator" }
];

type InviteDrawerProps = {
  open: boolean;
  onClose: () => void;
  onInvite: (input: {
    email: string;
    role: "COORDINATOR" | "PARISHIONER";
  }) => Promise<MemberActionState>;
};

export default function InviteDrawer({ open, onClose, onInvite }: InviteDrawerProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"COORDINATOR" | "PARISHIONER">("PARISHIONER");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!email.trim()) {
      addToast({
        title: "Email required",
        description: "Enter an email address to add a member.",
        status: "warning"
      });
      return;
    }

    startTransition(async () => {
      const result = await onInvite({ email: email.trim(), role });
      if (result.status === "error") {
        addToast({
          title: "Could not add member",
          description: result.message,
          status: "error"
        });
        return;
      }

      addToast({
        title: "Member added",
        description: "They now belong to this group.",
        status: "success"
      });
      setEmail("");
      setRole("PARISHIONER");
      onClose();
      router.refresh();
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a parishioner"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} isLoading={isPending}>
            Add member
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-500">
        Add a parishioner directly to this ministry group.
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
            onValueChange={(value) => setRole(value as "COORDINATOR" | "PARISHIONER")}
            options={roleOptions}
          />
        </div>
      </div>
    </Drawer>
  );
}
