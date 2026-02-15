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

if (process.env.DATABASE_URL) {
  console.log("[build] DATABASE_URL detected. Running prisma migrate deploy...");
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.warn("[build] DATABASE_URL is not set. Skipping prisma migrate deploy and running prisma generate only.");
  run("npx", ["prisma", "generate"]);
}

console.log("[build] Running next build...");
run("npx", ["next", "build"]);
