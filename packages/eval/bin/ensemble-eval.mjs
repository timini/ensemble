#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(scriptDir, '../src/cli.ts');

const child = spawn(
  process.execPath,
  ['--import', 'tsx', cliPath, ...process.argv.slice(2)],
  { stdio: 'inherit' },
);

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
