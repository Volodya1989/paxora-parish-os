#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

async function collectTests(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await collectTests(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

function runFile(file) {
  return spawnSync(
    process.execPath,
    ['--test', '--experimental-test-module-mocks', '--test-concurrency=1', '--import', 'tsx', file],
    { stdio: 'inherit', env: process.env }
  );
}

const files = (await collectTests('tests')).sort();
let failed = false;

for (const file of files) {
  const first = runFile(file);
  if (first.status === 0) {
    continue;
  }

  console.error(`\n[test-runner] Retry once after failure: ${file}\n`);
  const second = runFile(file);
  if (second.status !== 0) {
    failed = true;
    console.error(`\n[test-runner] Failed after retry: ${file}\n`);
  }
}

if (failed) {
  process.exit(1);
}
