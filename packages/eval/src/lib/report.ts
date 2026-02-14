import type { PromptRunResult, ProviderResponse } from '../types.js';

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function toMs(value: number): string {
  return `${Math.round(value)} ms`;
}

function summarizeResponses(responses: ProviderResponse[]): {
  successful: number;
  failed: number;
  averageResponseTimeMs: number;
  averageTokenCount: number;
} {
  const successful = responses.filter((response) => !response.error);
  const failed = responses.length - successful.length;

  const responseTimes = successful
    .map((response) => response.responseTimeMs)
    .filter((value) => value > 0);

  const tokenCounts = successful
    .map((response) => response.tokenCount ?? 0)
    .filter((value) => value > 0);

  return {
    successful: successful.length,
    failed,
    averageResponseTimeMs: average(responseTimes),
    averageTokenCount: average(tokenCounts),
  };
}

export function createMarkdownReport(
  sourceFile: string,
  runs: PromptRunResult[],
): string {
  const allResponses = runs.flatMap((run) => run.responses);
  const summary = summarizeResponses(allResponses);

  const lines: string[] = [];
  lines.push('# Ensemble Eval Report');
  lines.push('');
  lines.push(`Source: \`${sourceFile}\``);
  lines.push('');
  lines.push('## Run Summary');
  lines.push('');
  lines.push(`- Prompts evaluated: ${runs.length}`);
  lines.push(`- Successful responses: ${summary.successful}`);
  lines.push(`- Failed responses: ${summary.failed}`);
  lines.push(`- Average response time: ${toMs(summary.averageResponseTimeMs)}`);
  lines.push(
    `- Average token count (successful responses): ${Math.round(summary.averageTokenCount)}`,
  );
  lines.push('');
  lines.push('## Consensus Coverage');
  lines.push('');

  const strategyCounts = new Map<string, number>();
  for (const run of runs) {
    for (const strategy of Object.keys(run.consensus)) {
      strategyCounts.set(strategy, (strategyCounts.get(strategy) ?? 0) + 1);
    }
  }

  if (strategyCounts.size === 0) {
    lines.push('- No consensus output found.');
  } else {
    for (const [strategy, count] of strategyCounts.entries()) {
      lines.push(`- \`${strategy}\`: ${count} prompt(s)`);
    }
  }

  return `${lines.join('\n')}\n`;
}
