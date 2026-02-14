#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { createProgram } from './program.js';

export async function runCli(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  void runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
