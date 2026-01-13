export type TaskActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialTaskActionState: TaskActionState = {
  status: "idle"
};
