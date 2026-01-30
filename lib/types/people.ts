export type PeopleActionError =
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "LEADERSHIP_REQUIRED";

export type PeopleActionState = {
  status: "success" | "error";
  message: string;
  error?: PeopleActionError;
};
