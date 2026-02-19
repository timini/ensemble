#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { createProgram } from './program.js';

// Prevent unhandled rejections from crashing the process.
// The Google Generative AI SDK can emit stream errors via ReadableStream
// controller.error() that escape normal try/catch in async iterators.
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  process.stderr.write(`  [unhandled rejection] ${message}\n`);
});

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
