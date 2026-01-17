import type { TaskActionState } from "@/server/actions/taskState";

export function shouldCloseTaskDialog(
  state: TaskActionState,
  hasHandledSuccess: boolean
): boolean {
  return state.status === "success" && !hasHandledSuccess;
}
