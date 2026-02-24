import { Prisma } from "@prisma/client";

export function isMissingColumnError(error: unknown, columnName?: string) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2022") {
    return false;
  }

  if (!columnName) {
    return true;
  }

  const column = typeof error.meta?.column === "string" ? error.meta.column : "";

  return column.includes(columnName);
}
