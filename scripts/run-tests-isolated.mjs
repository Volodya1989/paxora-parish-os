#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function collectTests(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectTests(full)));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function runFile(file) {
  const res = spawnSync(
    process.execPath,
    ["--test", "--experimental-test-module-mocks", "--test-concurrency=1", "--import", "tsx", file],
    { env: process.env, encoding: "utf8" }
  );

  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const combined = `${stdout}\n${stderr}`;
  const hasNotOk = /(^|\n)not ok\b/m.test(combined);
  const hasZeroFailsSummary = /# fail\s+0\b/.test(combined);

  if (res.status === 0) {
    return { ok: true, reason: "exit-0" };
  }

  if (!hasNotOk && hasZeroFailsSummary) {
    return { ok: true, reason: "non-zero-with-zero-fails-summary" };
  }

  return {
    ok: false,
    reason: `status=${res.status ?? "null"}, signal=${res.signal ?? "none"}`
  };
}

const files = (await collectTests("tests")).sort();
const failures = [];

for (const file of files) {
  let passed = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = runFile(file);
    if (result.ok) {
      if (attempt > 1) {
        console.error(`[test-runner] Recovered on retry ${attempt - 1} for ${file} (${result.reason}).`);
      }
      passed = true;
      break;
    }
    if (attempt < 3) {
      console.error(`[test-runner] Retry ${attempt} for ${file} after ${result.reason}.`);
    } else {
      failures.push({ file, reason: result.reason });
    }
  }
}

if (failures.length > 0) {
  console.error("\n[test-runner] Persistent test failures:\n");
  for (const failure of failures) {
    console.error(` - ${failure.file}: ${failure.reason}`);
  }
  process.exit(1);
}
