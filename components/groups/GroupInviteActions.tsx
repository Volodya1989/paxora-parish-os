"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { acceptInvite, declineInvite } from "@/app/actions/members";

type GroupInviteActionsProps = {
  groupId: string;
};

export default function GroupInviteActions({ groupId }: GroupInviteActionsProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptInvite({ groupId });
      if (result.status === "error") {
        addToast({
          title: "Could not accept invite",
          description: result.message,
          status: "error"
        });
        return;
      }
      addToast({
        title: "Invite accepted",
        description: result.message,
        status: "success"
      });
      router.refresh();
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      const result = await declineInvite({ groupId });
      if (result.status === "error") {
        addToast({
          title: "Could not decline invite",
          description: result.message,
          status: "error"
        });
        return;
      }
      addToast({
        title: "Invite declined",
        description: result.message,
        status: "success"
      });
      router.push("/groups");
    });
  };

  return (
    <Card className="border-primary-200 bg-primary-50/40">
      <h2 className="text-lg font-semibold text-ink-900">You&apos;re invited to this group</h2>
      <p className="mt-1 text-sm text-ink-500">
        Accept to join and start collaborating, or decline if it&apos;s not the right fit.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={handleAccept} isLoading={isPending}>
          Accept invite
        </Button>
        <Button type="button" variant="secondary" onClick={handleDecline} disabled={isPending}>
          Decline
        </Button>
      </div>
    </Card>
  );
}
