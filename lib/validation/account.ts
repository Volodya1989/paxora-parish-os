import { z } from "zod";

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: "Type DELETE to confirm." })
  })
});
