export type MemberActionError =
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "ALREADY_MEMBER"
  | "ALREADY_PENDING"
  | "INVALID_POLICY"
  | "VALIDATION_ERROR";

export type MemberActionState = {
  status: "success" | "error";
  message: string;
  error?: MemberActionError;
};
