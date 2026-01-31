export type ParishInviteActionError =
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "ALREADY_MEMBER"
  | "ALREADY_PENDING"
  | "EXPIRED"
  | "INVALID_TOKEN"
  | "REVOKED"
  | "EMAIL_MISMATCH";

export type ParishInviteActionState = {
  status: "success" | "error";
  message: string;
  error?: ParishInviteActionError;
};
