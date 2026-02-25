import { spawnSync } from "node:child_process";

const FAILED_MIGRATION = "20270814090000_task_display_id_archive_status";

function run(command, args, { allowFailure = false, capture = false } = {}) {
  const result = spawnSync(command, args, {
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf-8",
    env: process.env,
    shell: process.platform === "win32"
  });

  if (capture) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }

  return result;
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const isVercelBuild = process.env.VERCEL === "1" || process.env.VERCEL_ENV;
const skipMigrations = process.env.SKIP_PRISMA_MIGRATIONS === "true";

if (hasDatabaseUrl && !skipMigrations) {
  if (isVercelBuild) {
    console.log("[build] Vercel build detected. Running prisma migrate deploy with recovery for known failed migration state...");

    run("npx", ["prisma", "migrate", "resolve", "--rolled-back", FAILED_MIGRATION], {
      allowFailure: true
    });

    const deploy = run("npx", ["prisma", "migrate", "deploy"], { allowFailure: true, capture: true });

    if (deploy.status !== 0) {
      console.error("[build] prisma migrate deploy failed.");
      process.exit(deploy.status ?? 1);
    }
  } else {
    console.log("[build] Running prisma migrate deploy before build...");
    run("npx", ["prisma", "migrate", "deploy"]);
  }
} else {
  if (!hasDatabaseUrl) {
    console.warn("[build] DATABASE_URL is not set. Skipping prisma migrate deploy.");
  } else if (skipMigrations) {
    console.warn("[build] SKIP_PRISMA_MIGRATIONS=true. Skipping prisma migrate deploy.");
  }
}

run("npx", ["prisma", "generate"]);
run("node", ["scripts/check-prisma-schema-sync.mjs"]);
console.log("[build] Running next build...");
run("npx", ["next", "build"]);
