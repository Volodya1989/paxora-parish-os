import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isStrictModeEnabled() {
  return process.env.PRISMA_SCHEMA_SYNC_STRICT === "true";
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[schema-check] DATABASE_URL is not set. Skipping schema drift check.");
    return;
  }

  const rows = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name IN ('Membership', 'membership')
      AND column_name = 'allowParishGreetings'
    LIMIT 1
  `;

  if (rows.length > 0) {
    console.log("[schema-check] Membership.allowParishGreetings exists.");
    return;
  }

  const message =
    "Missing Membership.allowParishGreetings in target database. Run `prisma migrate deploy` against the same DATABASE_URL used at runtime.";

  if (isStrictModeEnabled()) {
    throw new Error(message);
  }

  console.warn(`[schema-check] Warning: ${message}`);
}

main()
  .catch((error) => {
    console.error("[schema-check] Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
