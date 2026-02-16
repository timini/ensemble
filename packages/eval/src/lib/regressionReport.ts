import type { RegressionResult, StrategyRegressionResult, BrokenQuestion } from './regressionTypes.js';

/** Options for controlling the regression report output. */
export interface RegressionReportOptions {
  /** Prompt files that changed in the PR. */
  changedFiles?: string[];
  /** Whether to include broken question details. Defaults to `true`. */
  includeDetails?: boolean;
}

/**
 * Format a number as a percentage with 1 decimal place.
 * Values like 0.8 become "80.0%".
 */
function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format a delta percentage with explicit sign prefix.
 * Positive values get "+", negative values get "-", zero gets no prefix.
 */
function toDelta(value: number): string {
  const pct = (value * 100).toFixed(1);
  if (value > 0) {
    return `+${pct}%`;
  }
  return `${pct}%`;
}

/** Format a duration in milliseconds as "Xm Ys". */
function toDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

/** Format a token count with thousands separators (locale-independent). */
function toTokens(count: number): string {
  return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Format a USD cost with 2 decimal places. */
function toUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Return emoji status indicator — only significant regressions (negative delta) fail. */
function statusEmoji(row: StrategyRegressionResult): string {
  if (row.significant && row.delta < 0) return ':x:';
  return ':white_check_mark:';
}

/** Escape pipe characters in a string so they don't break markdown table cells. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|');
}


function renderHeader(result: RegressionResult): string[] {
  const lines: string[] = [];
  const passIcon = result.passed ? ':white_check_mark: **PASSED**' : ':x: **FAILED**';

  lines.push('# Regression Report');
  lines.push('');
  lines.push(`| | |`);
  lines.push(`| --- | --- |`);
  lines.push(`| **Tier** | ${result.tier} |`);
  lines.push(`| **Commit** | \`${result.commitSha}\` |`);
  lines.push(`| **Baseline** | \`${result.baselineCommitSha}\` |`);
  lines.push(`| **Result** | ${passIcon} |`);
  lines.push('');

  return lines;
}

function renderAccuracyTable(perStrategy: StrategyRegressionResult[]): string[] {
  const lines: string[] = [];

  lines.push('## Accuracy');
  lines.push('');
  lines.push('| Strategy | Dataset | Baseline | Current | Delta | p-value | Status |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | :---: |');

  for (const row of perStrategy) {
    lines.push(
      `| ${row.strategy} | ${row.dataset} | ${toPercent(row.baselineAccuracy)} | ${toPercent(row.currentAccuracy)} | ${toDelta(row.delta)} | ${row.pValue.toFixed(3)} | ${statusEmoji(row)} |`,
    );
  }

  lines.push('');
  return lines;
}

function renderBrokenQuestions(questions: BrokenQuestion[]): string[] {
  const lines: string[] = [];

  lines.push('## Broken Questions');
  lines.push('');
  lines.push(
    '| Question ID | Dataset | Strategy | Ground Truth | Baseline Answer | Current Answer |',
  );
  lines.push('| --- | --- | --- | --- | --- | --- |');

  for (const q of questions) {
    lines.push(
      `| ${escapeCell(q.questionId)} | ${q.dataset} | ${q.strategy} | ${escapeCell(q.groundTruth)} | ${escapeCell(q.baselineAnswer)} | ${escapeCell(q.currentAnswer)} |`,
    );
  }

  lines.push('');
  return lines;
}

function renderChangedFiles(files: string[]): string[] {
  const lines: string[] = [];

  lines.push('## Changed Files');
  lines.push('');
  for (const file of files) {
    lines.push(`- \`${file}\``);
  }
  lines.push('');

  return lines;
}

function renderStability(result: RegressionResult): string[] {
  if (!result.stability) return [];

  const lines: string[] = [];

  lines.push('## Stability');
  lines.push('');
  lines.push(`Runs completed: **${result.stability.runsCompleted}**`);
  lines.push('');
  lines.push('| Strategy | Variance |');
  lines.push('| --- | ---: |');

  for (const [strategy, variance] of Object.entries(result.stability.accuracyVariance)) {
    lines.push(`| ${strategy} | ${variance.toFixed(4)} |`);
  }

  lines.push('');
  return lines;
}

function renderCost(result: RegressionResult): string[] {
  const lines: string[] = [];
  const { cost } = result;

  lines.push('## Cost');
  lines.push('');
  lines.push(`| | |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| **Tokens** | ${toTokens(cost.totalTokens)} |`);
  lines.push(`| **Cost** | ${toUsd(cost.totalCostUsd)} |`);
  lines.push(`| **Duration** | ${toDuration(cost.durationMs)} |`);
  lines.push('');

  return lines;
}

/**
 * Generate a Markdown regression report suitable for PR comments.
 *
 * @param result - The regression evaluation result to report on.
 * @param options - Optional configuration for report generation.
 * @returns A complete Markdown string for the regression report.
 */
export function createRegressionReport(
  result: RegressionResult,
  options?: RegressionReportOptions,
): string {
  const includeDetails = options?.includeDetails ?? true;
  const changedFiles = options?.changedFiles;

  const lines: string[] = [];

  lines.push(...renderHeader(result));
  lines.push(...renderAccuracyTable(result.perStrategy));

  if (includeDetails && result.brokenQuestions.length > 0) {
    lines.push(...renderBrokenQuestions(result.brokenQuestions));
  }

  if (changedFiles && changedFiles.length > 0) {
    lines.push(...renderChangedFiles(changedFiles));
  }

  lines.push(...renderStability(result));
  lines.push(...renderCost(result));

  return lines.join('\n');
}
