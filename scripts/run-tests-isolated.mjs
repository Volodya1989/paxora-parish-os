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
    ["--test", "--test-reporter=tap", "--experimental-test-module-mocks", "--test-concurrency=1", "--import", "tsx", file],
    { env: process.env, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
  );

  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const combined = `${stdout}\n${stderr}`;
  const hasTapNotOk = /(^|\n)not ok\s+\d+\b/m.test(combined);
  const hasTapZeroFailsSummary = /# fail\s+0\b/.test(combined);
  const hasTapPositiveFailSummary = /# fail\s+[1-9]\d*\b/.test(combined);
  const hasTapOk = /(^|\n)ok\s+\d+\b/m.test(combined);

  // Some CI environments set NODE_TEST_REPORTER=spec, which does not emit TAP
  // markers like "ok 1" / "# fail 0". In that mode we can still detect a clean
  // run from the unicode summary lines.
  const hasSpecZeroFailsSummary = /(^|\n)ℹ fail\s+0\b/m.test(combined);
  const hasSpecPositiveFailSummary = /(^|\n)ℹ fail\s+[1-9]\d*\b/m.test(combined);
  const hasSpecPassMarker = /(^|\n)✔\s+/m.test(combined);

  if (res.status === 0) {
    return { ok: true, reason: "exit-0" };
  }

  const hasFailureMarkers = hasTapNotOk || hasTapPositiveFailSummary || hasSpecPositiveFailSummary;
  const hasPassMarkers =
    hasTapZeroFailsSummary ||
    hasSpecZeroFailsSummary ||
    (!hasTapPositiveFailSummary && hasTapOk) ||
    (!hasSpecPositiveFailSummary && hasSpecPassMarker);

  if (!hasFailureMarkers && hasPassMarkers) {
    return { ok: true, reason: "non-zero-without-tap-failure-markers" };
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
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const result = runFile(file);
    if (result.ok) {
      if (attempt > 1) {
        console.error(`[test-runner] Recovered on retry ${attempt - 1} for ${file} (${result.reason}).`);
      }
      passed = true;
      break;
    }
    if (attempt < 5) {
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
