"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ParishRole } from "@prisma/client";
import Button from "@/components/ui/Button";
import Card, { CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@/components/ui/Dropdown";
import { useToast } from "@/components/ui/Toast";
import RoleChip from "@/components/groups/members/RoleChip";
import { deleteUser, removeMember, updateMemberRole } from "@/app/actions/people";
import { createParishInvite, revokeParishInvite } from "@/app/actions/parishInvites";
import type { ParishInviteRecord, ParishMemberRecord } from "@/lib/queries/people";
import type { PeopleActionState } from "@/lib/types/people";
import type { ParishInviteActionState } from "@/lib/types/parishInvites";

const roleOptions: Array<{ role: ParishRole; label: string }> = [
  { role: "ADMIN", label: "Admin" },
  { role: "SHEPHERD", label: "Clergy" },
  { role: "MEMBER", label: "Parishioner" }
];

const inviteRoleOptions = [
  { value: "MEMBER", label: "Parishioner" },
  { value: "SHEPHERD", label: "Clergy" },
  { value: "ADMIN", label: "Admin" }
] satisfies Array<{ value: ParishRole; label: string }>;

const handleResult = (
  result: PeopleActionState | ParishInviteActionState,
  addToast: ReturnType<typeof useToast>["addToast"],
  fallback: string
) => {
  if (result.status === "error") {
    addToast({
      title: "Update failed",
      description: result.message || fallback,
      status: "error"
    });
    return false;
  }
  return true;
};

const lastLoginFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

function formatLastLogin(lastLoginAt?: Date | null) {
  if (!lastLoginAt) {
    return "Never";
  }

  return lastLoginFormatter.format(lastLoginAt);
}

type PeopleViewProps = {
  members: ParishMemberRecord[];
  invites: ParishInviteRecord[];
  viewerId: string;
  parishId: string;
  viewerPlatformRole: "SUPERADMIN" | null;
  initialSearchQuery: string;
};

export default function PeopleView({
  members,
  invites,
  viewerId,
  parishId,
  viewerPlatformRole,
  initialSearchQuery
}: PeopleViewProps) {
  const { addToast } = useToast();
  const session = useSession();
  const updateSession = session?.update;
  const router = useRouter();
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ParishMemberRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ParishMemberRecord | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOutDevices, setIsLoggingOutDevices] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ParishRole>("MEMBER");
  const [isPendingInvite, startInviteTransition] = useTransition();
  const [, startTransition] = useTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const hasMembers = members.length > 0;
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearchQuery.trim());
  const [displayedMembers, setDisplayedMembers] = useState(members);
  const [isSearching, setIsSearching] = useState(false);
  const activeSearchRequest = useRef(0);

  useEffect(() => {
    setDisplayedMembers(members);
  }, [members]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }

    const nextQuery = params.toString();
    const currentQuery = searchParamsString;
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }

    if (debouncedSearch.length < 2) {
      setDisplayedMembers(members);
      setIsSearching(false);
      return;
    }

    const requestId = activeSearchRequest.current + 1;
    activeSearchRequest.current = requestId;
    setIsSearching(true);

    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(
          `/api/parishes/${parishId}/members?query=${encodeURIComponent(debouncedSearch)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to search members.");
        }

        const payload = (await response.json()) as { members?: ParishMemberRecord[] };
        if (activeSearchRequest.current === requestId) {
          setDisplayedMembers(payload.members ?? []);
        }
      } catch {
        if (!controller.signal.aborted) {
          addToast({
            title: "Search failed",
            description: "Please try again.",
            status: "error"
          });
        }
      } finally {
        if (activeSearchRequest.current === requestId) {
          setIsSearching(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [addToast, debouncedSearch, members, parishId, pathname, router, searchParamsString]);

  const refresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const runAction = async (
    action: () => Promise<PeopleActionState | ParishInviteActionState>,
    successTitle: string
  ) => {
    const result = await action();
    if (handleResult(result, addToast, "Please try again.")) {
      addToast({
        title: successTitle,
        description: result.message,
        status: "success"
      });
      refresh();
    }
  };

  const handleRoleChange = (memberId: string, role: ParishRole) => {
    setPendingMemberId(memberId);
    void runAction(
      async () => {
        const result = await updateMemberRole({ memberId, role });
        setPendingMemberId(null);
        return result;
      },
      "Role updated"
    );
  };

  const handleRemove = (member: ParishMemberRecord) => {
    setRemoveTarget(member);
  };

  const handleLogoutAllDevices = () => {
    if (isLoggingOutDevices) {
      return;
    }

    setIsLoggingOutDevices(true);
    void (async () => {
      try {
        const response = await fetch("/api/security/logout-all", {
          method: "POST"
        });

        if (!response.ok) {
          let description = "Please try again.";
          try {
            const payload = await response.json() as { error?: string };
            if (payload.error) {
              description = payload.error;
            }
          } catch {
            // ignore parse failures and keep fallback copy
          }

          addToast({
            title: "Update failed",
            description,
            status: "error"
          });
          return;
        }

        if (typeof updateSession === "function") {
          await updateSession();
        } else {
          refresh();
        }

        addToast({
          title: "Signed out on other devices",
          description: "Other browser and device sessions were revoked.",
          status: "success"
        });
      } catch {
        addToast({
          title: "Update failed",
          description: "Please try again.",
          status: "error"
        });
      } finally {
        setIsLoggingOutDevices(false);
        setLogoutConfirmOpen(false);
      }
    })();
  };

  const handleRemoveConfirm = () => {
    if (!removeTarget) {
      return;
    }
    const memberId = removeTarget.id;
    setRemoveTarget(null);
    setPendingMemberId(memberId);
    void runAction(
      async () => {
        const result = await removeMember({ memberId });
        setPendingMemberId(null);
        return result;
      },
      "Member removed"
    );
  };

  const removeName = removeTarget?.name ?? removeTarget?.email ?? "this member";
  const deleteName = deleteTarget?.name ?? deleteTarget?.email ?? "this user";
  const inviteRows = invites.map((invite) => {
    const isBusy = pendingInviteId === invite.id;
    const invitedBy =
      invite.invitedBy?.name ?? invite.invitedBy?.email ?? "a parish leader";
    return (
      <div
        key={invite.id}
        className="flex flex-col gap-3 rounded-card border border-mist-200 bg-white p-4 shadow-card sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p className="text-sm font-semibold text-ink-900 sm:text-base">{invite.email}</p>
          <p className="text-xs text-ink-500">Invited by {invitedBy}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
          <RoleChip role={invite.role} />
          <Badge tone="neutral">Invited</Badge>
          <span>
            {invite.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setPendingInviteId(invite.id);
              void runAction(
                async () => {
                  const result = await revokeParishInvite({ inviteId: invite.id });
                  setPendingInviteId(null);
                  return result;
                },
                "Invite revoked"
              );
            }}
            disabled={isBusy}
          >
            Revoke
          </Button>
        </div>
      </div>
    );
  });

  const memberRows = displayedMembers.map((member) => {
    const displayName = member.name ?? member.email;
    const isBusy = pendingMemberId === member.id;
    return (
      <div
        key={member.id}
        className="flex flex-col gap-3 rounded-card border border-mist-200 bg-white p-4 shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900 sm:text-base">{displayName}</p>
            <p className="text-sm text-ink-500">{member.email}</p>
            <p className="text-xs text-ink-500">Last login: {formatLastLogin(member.lastLoginAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleChip role={member.role} />
            <Badge tone="success">Active</Badge>
            <Dropdown>
              <DropdownTrigger
                asChild
                iconOnly
                aria-label={`Actions for ${displayName}`}
                disabled={isBusy}
              >
                <button className="rounded-full border border-mist-200 bg-white px-2 py-1 text-xs text-ink-600 shadow-card transition hover:border-mist-300">
                  •••
                </button>
              </DropdownTrigger>
              <DropdownMenu ariaLabel={`Member actions for ${displayName}`}>
                {roleOptions.map((option) => (
                  <DropdownItem
                    key={option.role}
                    onClick={() => handleRoleChange(member.id, option.role)}
                    disabled={option.role === member.role || isBusy}
                  >
                    Make {option.label}
                  </DropdownItem>
                ))}
                <DropdownItem onClick={() => handleRemove(member)} disabled={isBusy}>
                  Remove access
                </DropdownItem>
                {viewerPlatformRole === "SUPERADMIN" ? (
                  <DropdownItem onClick={() => setDeleteTarget(member)} disabled={isBusy || member.userId === viewerId}>
                    Delete user
                  </DropdownItem>
                ) : null}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        {member.userId === viewerId ? (
          <p className="text-xs text-ink-400">
            You are signed in as this member.
          </p>
        ) : null}
      </div>
    );
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 overflow-x-hidden pb-2 md:space-y-5">

      <Card>
        <div className="space-y-5">
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Review active parish members, their role assignments, and recent sign-in activity.
            </CardDescription>
          </CardHeader>
          {!hasMembers ? (
            <EmptyState
              title="No members yet"
              description="Invite parishioners to start coordinating people and roles."
              action={
                <Button type="button" variant="secondary" onClick={() => setInviteOpen(true)}>
                  Invite member
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="people-search">Search</Label>
                <div className="relative">
                  <Input
                    id="people-search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name or email..."
                    className="pr-10"
                  />
                  {searchInput.trim().length > 0 ? (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-ink-500 hover:text-ink-700"
                      onClick={() => setSearchInput("")}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>

              {isSearching ? (
                <p className="text-sm text-ink-500">Searching members…</p>
              ) : null}

              {displayedMembers.length === 0 ? (
                <EmptyState
                  title="No members found."
                  description="Try another name or email."
                />
              ) : (
                <div className="space-y-3">{memberRows}</div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <CardHeader>
            <CardTitle>Invites</CardTitle>
            <CardDescription>Track outstanding invitations to join your parish.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-500">
              Send invites to new parishioners and track who still needs to accept.
            </p>
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          </div>
          {invites.length === 0 ? (
            <EmptyState
              title="No pending invites"
              description="Invites will appear here once they are sent."
            />
          ) : (
            <div className="space-y-3">{inviteRows}</div>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-5">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage parish account sessions for this admin team.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-mist-200 bg-mist-50/60 p-4">
            <div>
              <p className="text-sm font-medium text-ink-900">Log out of all devices</p>
              <p className="text-sm text-ink-500">
                This will sign out this account on other browsers and devices.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setLogoutConfirmOpen(true)}>
              Log out all devices
            </Button>
          </div>
        </div>
      </Card>


      <Modal
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        title="Log out of all devices?"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setLogoutConfirmOpen(false)} disabled={isLoggingOutDevices}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleLogoutAllDevices} isLoading={isLoggingOutDevices}>
              Log out
            </Button>
          </>
        }
      >
        <p>
          This will sign you out from other devices and browsers.
        </p>
      </Modal>

      <Drawer
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        title="Log out of all devices?"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setLogoutConfirmOpen(false)} disabled={isLoggingOutDevices}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleLogoutAllDevices} isLoading={isLoggingOutDevices}>
              Log out
            </Button>
          </>
        }
      >
        <p>
          This will sign you out from other devices and browsers.
        </p>
      </Drawer>

      <Modal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove member"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleRemoveConfirm}>
              Remove access
            </Button>
          </>
        }
      >
        <p>
          Remove {removeName} from this parish? They will lose access immediately.
        </p>
      </Modal>

      <Drawer
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove member"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleRemoveConfirm}>
              Remove access
            </Button>
          </>
        }
      >
        <p>
          Remove {removeName} from this parish? They will lose access immediately.
        </p>
      </Drawer>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }
                const userId = deleteTarget.userId;
                setDeleteTarget(null);
                setPendingMemberId(deleteTarget.id);
                void runAction(
                  async () => {
                    const result = await deleteUser({ userId });
                    setPendingMemberId(null);
                    return result;
                  },
                  "User deleted"
                );
              }}
            >
              Delete user
            </Button>
          </>
        }
      >
        <p>
          Delete {deleteName} from the entire platform? This anonymizes the account and removes all
          membership access across parishes.
        </p>
      </Modal>

      <Drawer
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }
                const userId = deleteTarget.userId;
                setDeleteTarget(null);
                setPendingMemberId(deleteTarget.id);
                void runAction(
                  async () => {
                    const result = await deleteUser({ userId });
                    setPendingMemberId(null);
                    return result;
                  },
                  "User deleted"
                );
              }}
            >
              Delete user
            </Button>
          </>
        }
      >
        <p>
          Delete {deleteName} from the entire platform? This anonymizes the account and removes all
          membership access across parishes.
        </p>
      </Drawer>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a parishioner"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!inviteEmail.trim()) {
                  addToast({
                    title: "Email required",
                    description: "Enter an email address to send an invite.",
                    status: "warning"
                  });
                  return;
                }
                startInviteTransition(async () => {
                  const result = await createParishInvite({
                    parishId,
                    email: inviteEmail.trim(),
                    role: inviteRole
                  });
                  if (result.status === "error") {
                    addToast({
                      title: "Invite failed",
                      description: result.message,
                      status: "error"
                    });
                    return;
                  }
                  addToast({
                    title: "Invite sent",
                    description: "We let them know how to join the parish.",
                    status: "success"
                  });
                  setInviteEmail("");
                  setInviteRole("MEMBER");
                  setInviteOpen(false);
                  refresh();
                });
              }}
              isLoading={isPendingInvite}
            >
              Send invite
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-500">
          Send a simple invitation to join this parish community.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.currentTarget.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <SelectMenu
              id="invite-role"
              name="role"
              value={inviteRole}
              onValueChange={(value) => setInviteRole(value as ParishRole)}
              options={inviteRoleOptions}
            />
          </div>
        </div>
      </Modal>

      <Drawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a parishioner"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!inviteEmail.trim()) {
                  addToast({
                    title: "Email required",
                    description: "Enter an email address to send an invite.",
                    status: "warning"
                  });
                  return;
                }
                startInviteTransition(async () => {
                  const result = await createParishInvite({
                    parishId,
                    email: inviteEmail.trim(),
                    role: inviteRole
                  });
                  if (result.status === "error") {
                    addToast({
                      title: "Invite failed",
                      description: result.message,
                      status: "error"
                    });
                    return;
                  }
                  addToast({
                    title: "Invite sent",
                    description: "We let them know how to join the parish.",
                    status: "success"
                  });
                  setInviteEmail("");
                  setInviteRole("MEMBER");
                  setInviteOpen(false);
                  refresh();
                });
              }}
              isLoading={isPendingInvite}
            >
              Send invite
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-500">
          Send a simple invitation to join this parish community.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email-drawer">Email</Label>
            <Input
              id="invite-email-drawer"
              type="email"
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.currentTarget.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role-drawer">Role</Label>
            <SelectMenu
              id="invite-role-drawer"
              name="role"
              value={inviteRole}
              onValueChange={(value) => setInviteRole(value as ParishRole)}
              options={inviteRoleOptions}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
