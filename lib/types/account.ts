export type AccountDeletionError =
  | "NOT_AUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "LAST_PLATFORM_ADMIN";

export type AccountDeletionState = {
  status: "success" | "error";
  message: string;
  error?: AccountDeletionError;
};
