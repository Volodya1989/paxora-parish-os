export type PeopleActionError =
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "LEADERSHIP_REQUIRED"
  | "PLATFORM_ADMIN_REQUIRED"
  | "LAST_PLATFORM_ADMIN"
  | "SELF_DELETE_BLOCKED";

export type PeopleActionState = {
  status: "success" | "error";
  message: string;
  error?: PeopleActionError;
};
