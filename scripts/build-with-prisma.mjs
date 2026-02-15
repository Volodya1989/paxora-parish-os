import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const isVercelBuild = process.env.VERCEL === "1" || process.env.VERCEL_ENV;
const forceMigrationsInBuild = process.env.RUN_PRISMA_MIGRATIONS_IN_BUILD === "true";

if (hasDatabaseUrl && (!isVercelBuild || forceMigrationsInBuild)) {
  console.log("[build] Running prisma migrate deploy before build...");
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  if (hasDatabaseUrl && isVercelBuild && !forceMigrationsInBuild) {
    console.warn(
      "[build] Vercel build detected. Skipping prisma migrate deploy to avoid blocking deploys on migration lock state."
    );
    console.warn(
      "[build] Run migrations in a separate release step. Set RUN_PRISMA_MIGRATIONS_IN_BUILD=true to override."
    );
  } else if (!hasDatabaseUrl) {
    console.warn("[build] DATABASE_URL is not set. Skipping prisma migrate deploy.");
  }

  run("npx", ["prisma", "generate"]);
}

console.log("[build] Running next build...");
run("npx", ["next", "build"]);
