import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const prismaBinary = () => {
  const bin = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return resolve(process.cwd(), "node_modules", ".bin", bin);
};

export async function applyMigrations() {
  await execFileAsync(prismaBinary(), ["migrate", "deploy"], {
    env: process.env
  });
}
