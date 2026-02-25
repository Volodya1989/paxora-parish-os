import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const isStrict = process.env.PRISMA_SCHEMA_SYNC_STRICT === "true";
const allowAutoFix = process.env.PRISMA_SCHEMA_SYNC_AUTOFIX !== "false";

async function hasMembershipGreetingsColumn() {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Membership'
        AND column_name = 'allowParishGreetings'
    ) AS column_exists
  `;

  return rows[0]?.column_exists === true;
}

async function applyMembershipGreetingsHotfix() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Membership"
      ADD COLUMN IF NOT EXISTS "allowParishGreetings" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "greetingsOptInAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "greetingsLastPromptedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "greetingsDoNotAskAgain" BOOLEAN NOT NULL DEFAULT false;
  `);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[schema-check] DATABASE_URL is not set. Skipping schema drift check.");
    return;
  }

  if (await hasMembershipGreetingsColumn()) {
    console.log("[schema-check] Membership.allowParishGreetings exists.");
    return;
  }

  const message =
    "Missing Membership.allowParishGreetings in target database. `prisma migrate deploy` reports no pending migrations, so this environment appears drifted.";

  if (allowAutoFix) {
    console.warn(`[schema-check] ${message}`);
    console.warn("[schema-check] Applying idempotent hotfix ALTER TABLE for Membership greeting columns...");
    await applyMembershipGreetingsHotfix();

    if (await hasMembershipGreetingsColumn()) {
      console.log("[schema-check] Hotfix applied: Membership.allowParishGreetings now exists.");
      return;
    }
  }

  if (isStrict) {
    throw new Error(
      `${message} Set PRISMA_SCHEMA_SYNC_AUTOFIX=true to let build apply the idempotent column hotfix, or fix drift manually.`
    );
  }

  console.warn("[schema-check] WARNING: schema drift still detected, continuing because PRISMA_SCHEMA_SYNC_STRICT!=true.");
}

main()
  .catch((error) => {
    console.error("[schema-check] Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
