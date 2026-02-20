export type PlatformParishActionError =
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_STATE";

export type PlatformParishActionState =
  | { status: "success"; message: string; inviteCode?: string }
  | { status: "error"; message: string; error: PlatformParishActionError };
