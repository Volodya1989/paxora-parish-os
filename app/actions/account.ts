"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { deleteAccountSchema } from "@/lib/validation/account";
import type { AccountDeletionState } from "@/lib/types/account";
import { softDeleteUserAccount } from "@/server/users/deletion";

function buildError(message: string, error: AccountDeletionState["error"]): AccountDeletionState {
  return {
    status: "error",
    message,
    error
  };
}

export async function deleteOwnAccount(input: { confirmation: string }): Promise<AccountDeletionState> {
  const parsed = deleteAccountSchema.safeParse(input);

  if (!parsed.success) {
    return buildError(parsed.error.errors[0]?.message ?? "Invalid confirmation.", "VALIDATION_ERROR");
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return buildError("You must be signed in to delete your account.", "NOT_AUTHORIZED");
  }

  const deleted = await softDeleteUserAccount(session.user.id);
  if (deleted.status === "not_found") {
    return buildError("Account not found.", "NOT_FOUND");
  }

  return {
    status: "success",
    message: "Your account has been deleted."
  };
}
