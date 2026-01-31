import { z } from "zod";
import { getMaxDayForMonth } from "@/lib/profile/dates";

const optionalMonth = z.number().int().min(1, "Month must be 1-12").max(12).nullable();
const optionalDay = z.number().int().min(1, "Day must be 1-31").max(31).nullable();

const validateMonthDayPair = (
  label: "birthday" | "anniversary",
  month: number | null,
  day: number | null,
  ctx: z.RefinementCtx
) => {
  const monthKey = `${label}Month`;
  const dayKey = `${label}Day`;

  if ((month === null) !== (day === null)) {
    if (month === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a month.", path: [monthKey] });
    }
    if (day === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a day.", path: [dayKey] });
    }
    return;
  }

  if (month === null || day === null) {
    return;
  }

  const maxDay = getMaxDayForMonth(month);
  if (day > maxDay) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Day must be between 1 and ${maxDay} for the selected month.`,
      path: [dayKey]
    });
  }
};

export const profileDatesSchema = z
  .object({
    birthdayMonth: optionalMonth,
    birthdayDay: optionalDay,
    anniversaryMonth: optionalMonth,
    anniversaryDay: optionalDay,
    greetingsOptIn: z.boolean()
  })
  .superRefine((data, ctx) => {
    validateMonthDayPair("birthday", data.birthdayMonth, data.birthdayDay, ctx);
    validateMonthDayPair("anniversary", data.anniversaryMonth, data.anniversaryDay, ctx);
  });

export type ProfileDatesInput = z.infer<typeof profileDatesSchema>;
