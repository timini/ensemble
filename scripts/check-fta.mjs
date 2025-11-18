#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const runFta = () =>
  spawnSync('npx', ['fta', 'packages/app', '--json'], {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });

const result = runFta();

if (result.error) {
  console.error('Failed to execute fta:', result.error);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

let parsed;

try {
  parsed = JSON.parse(result.stdout);
} catch (error) {
  console.error('Unable to parse fta output:', error);
  process.exit(1);
}

const failing = parsed.filter(
  (entry) => entry.assessment === 'Needs improvement',
);
const warnings = parsed.filter(
  (entry) => entry.assessment === 'Could be better',
);

if (warnings.length > 0) {
  console.warn('FTA warnings:');
  for (const file of warnings) {
    console.warn(
      ` - ${file.file_name}: ${file.assessment} (score ${file.fta_score?.toFixed?.(2) ?? 'n/a'})`,
    );
  }
}

if (failing.length > 0) {
  console.error('FTA failures:');
  for (const file of failing) {
    console.error(
      ` - ${file.file_name}: ${file.assessment} (score ${file.fta_score?.toFixed?.(2) ?? 'n/a'})`,
    );
  }
  process.exit(1);
}

console.log('FTA: no files require immediate attention');
