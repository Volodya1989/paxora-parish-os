import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[schema-check] DATABASE_URL is not set. Skipping schema drift check.");
    return;
  }

  const [membershipColumn] = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Membership'
      AND column_name = 'allowParishGreetings'
    LIMIT 1
  `;

  if (!membershipColumn) {
    throw new Error(
      "Missing Membership.allowParishGreetings in target database. Run `prisma migrate deploy` against the same DATABASE_URL used at runtime."
    );
  }

  console.log("[schema-check] Membership.allowParishGreetings exists.");
}

main()
  .catch((error) => {
    console.error("[schema-check] Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
