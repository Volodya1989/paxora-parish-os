"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import type { MemberActionState } from "@/lib/types/members";
import type { GroupInviteCandidate } from "@/lib/queries/groups";
import { useTranslations } from "@/lib/i18n/provider";

type InviteDrawerProps = {
  open: boolean;
  onClose: () => void;
  onInvite: (input: {
    email: string;
    role: "COORDINATOR" | "PARISHIONER";
  }) => Promise<MemberActionState>;
  candidates: GroupInviteCandidate[];
};

export default function InviteDrawer({ open, onClose, onInvite, candidates }: InviteDrawerProps) {
  const t = useTranslations();
  const router = useRouter();
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<GroupInviteCandidate | null>(null);
  const [role, setRole] = useState<"COORDINATOR" | "PARISHIONER">("PARISHIONER");
  const [isPending, startTransition] = useTransition();

  const roleOptions = useMemo(
    () => [
      { value: "PARISHIONER", label: t("inviteDrawer.roleParishioner") },
      { value: "COORDINATOR", label: t("inviteDrawer.roleCoordinator") }
    ],
    [t]
  );

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return candidates.filter((candidate) => {
      if (!normalizedQuery) {
        return true;
      }

      return `${candidate.name} ${candidate.email}`.toLowerCase().includes(normalizedQuery);
    });
  }, [candidates, query]);

  const handleSubmit = () => {
    if (!selectedCandidate?.email) {
      addToast({
        title: t("inviteDrawer.toasts.memberRequired"),
        description: t("inviteDrawer.toasts.memberRequiredDesc"),
        status: "warning"
      });
      return;
    }

    startTransition(async () => {
      const result = await onInvite({ email: selectedCandidate.email, role });
      if (result.status === "error") {
        addToast({
          title: t("inviteDrawer.toasts.couldNotAdd"),
          description: result.message,
          status: "error"
        });
        return;
      }

      addToast({
        title: t("inviteDrawer.toasts.memberAdded"),
        description: t("inviteDrawer.toasts.memberAddedDesc"),
        status: "success"
      });
      setQuery("");
      setSelectedCandidate(null);
      setRole("PARISHIONER");
      onClose();
      router.refresh();
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("inviteDrawer.title")}
      footer={(
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            {t("buttons.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} isLoading={isPending}>
            {t("inviteDrawer.addMember")}
          </Button>
        </>
      )}
    >
      <p className="mb-4 text-sm text-ink-500">
        {t("inviteDrawer.description")}
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-member-search">{t("inviteDrawer.selectParishioner")}</Label>
          <Input
            id="invite-member-search"
            placeholder={t("inviteDrawer.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <div className="max-h-44 overflow-y-auto rounded-xl border border-mist-200 bg-white">
            {filteredCandidates.slice(0, 30).map((candidate) => {
              const isSelected = selectedCandidate?.id === candidate.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    isSelected ? "bg-primary-50" : "hover:bg-mist-50"
                  }`}
                  onClick={() => setSelectedCandidate(candidate)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink-900">{candidate.name}</span>
                    <span className="block truncate text-xs text-ink-500">{candidate.email}</span>
                  </span>
                  <span className="ml-3 text-xs font-medium text-primary-600">
                    {isSelected ? t("inviteDrawer.selected") : t("inviteDrawer.select")}
                  </span>
                </button>
              );
            })}
            {filteredCandidates.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-500">{t("inviteDrawer.noMatching")}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-role">{t("inviteDrawer.role")}</Label>
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
