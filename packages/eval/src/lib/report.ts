import type { AnalysisSummary } from './analysisTypes.js';

function toPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function toUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function linesForAccuracyTable(title: string, rows: AnalysisSummary['modelAccuracy']): string[] {
  const lines = [title, '', '| Label | Accuracy | Correct / Total |', '| --- | ---: | ---: |'];
  for (const row of rows) {
    lines.push(`| ${row.label} | ${toPercent(row.accuracy)} | ${row.correct} / ${row.total} |`);
  }
  lines.push('');
  return lines;
}

export function createMarkdownReport(
  sourceFile: string,
  analysis: AnalysisSummary,
): string {
  const lines: string[] = [];
  lines.push('# Ensemble Eval Analysis Report');
  lines.push('');
  lines.push(`Source: \`${sourceFile}\``);
  lines.push(`Prompts analyzed: ${analysis.promptCount}`);
  lines.push(`Primary strategy: ${analysis.primaryStrategy ?? 'n/a'}`);
  lines.push('');

  lines.push(...linesForAccuracyTable('## Accuracy Summary - Models', analysis.modelAccuracy));
  lines.push(
    ...linesForAccuracyTable('## Accuracy Summary - Ensemble Strategies', analysis.strategyAccuracy),
  );

  lines.push('## Statistical Significance');
  lines.push('');
  if (analysis.comparisons.length === 0) {
    lines.push('- No model/strategy overlap available for paired tests.');
  } else {
    for (const comparison of analysis.comparisons) {
      lines.push(`- ${comparison.comparedAgainst} (n=${comparison.sampleSize})`);
      lines.push(
        `  - McNemar p-value: ${comparison.mcnemar.pValue.toExponential(3)}, chi-squared=${comparison.mcnemar.chiSquared.toFixed(4)}`,
      );
      lines.push(
        `  - Bootstrap delta: ${toPercent(comparison.bootstrap.meanDelta)} (95% CI ${toPercent(comparison.bootstrap.ciLow)} to ${toPercent(comparison.bootstrap.ciHigh)})`,
      );
    }
  }
  lines.push('');

  lines.push('## Agreement Calibration');
  lines.push('');
  lines.push('| Agreement Level | Accuracy | Correct / Total |');
  lines.push('| --- | ---: | ---: |');
  for (const row of analysis.agreementCalibration) {
    lines.push(`| ${row.level} | ${toPercent(row.accuracy)} | ${row.correct} / ${row.total} |`);
  }
  lines.push('');

  lines.push('## Category Breakdown');
  lines.push('');
  lines.push('| Category | Best Model | Ensemble | Lift | n |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const row of analysis.categoryBreakdown) {
    lines.push(
      `| ${row.key} | ${toPercent(row.bestModelAccuracy)} | ${toPercent(row.ensembleAccuracy)} | ${toPercent(row.lift)} | ${row.sampleSize} |`,
    );
  }
  lines.push('');

  lines.push('## Difficulty Breakdown');
  lines.push('');
  lines.push('| Difficulty | Best Model | Ensemble | Lift | n |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const row of analysis.difficultyBreakdown) {
    lines.push(
      `| ${row.key} | ${toPercent(row.bestModelAccuracy)} | ${toPercent(row.ensembleAccuracy)} | ${toPercent(row.lift)} | ${row.sampleSize} |`,
    );
  }
  lines.push('');

  lines.push('## Notable Examples');
  lines.push('');
  if (analysis.notableExamples.length === 0) {
    lines.push('- None found for current strategy/results.');
  } else {
    for (const example of analysis.notableExamples) {
      lines.push(`- ${example.questionId}: strategy "${example.strategy}" solved where models failed`);
      lines.push(`  - Ground truth: ${example.groundTruth}`);
      lines.push(`  - Ensemble answer: ${example.ensembleAnswer}`);
      lines.push(`  - Prompt: ${example.prompt}`);
    }
  }
  lines.push('');

  lines.push('## Cost Analysis');
  lines.push('');
  lines.push('| Label | Total Tokens | Total Estimated Cost | Avg Cost/Question |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const row of analysis.costAnalysis) {
    lines.push(
      `| ${row.label} | ${row.totalTokens} | ${toUsd(row.totalEstimatedCostUsd)} | ${toUsd(row.averageCostPerQuestionUsd)} |`,
    );
  }
  lines.push('');
  lines.push(
    '_Strategy costs are based on recorded model-response costs and may exclude extra summarizer-only overhead if not captured in the run schema._',
  );
  lines.push('');

  return `${lines.join('\n')}\n`;
}
