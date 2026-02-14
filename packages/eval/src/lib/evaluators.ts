import type {
  BenchmarkDatasetName,
  EvaluationResult,
} from '../types.js';

const NUMERIC_REGEX = /[-+]?\d[\d,]*(?:\.\d+)?/g;

export function extractNumericAnswer(value: string): string | null {
  const markerMatch = value.match(/####\s*([-+]?\d[\d,]*(?:\.\d+)?)/);
  if (markerMatch) {
    return markerMatch[1].replaceAll(',', '');
  }

  const matches = [...value.matchAll(NUMERIC_REGEX)];
  if (matches.length === 0) {
    return null;
  }

  return matches[matches.length - 1][0].replaceAll(',', '');
}

export function extractChoiceLetter(value: string): string | null {
  const boxedMatch = value.match(/\\boxed\{\s*([A-Z])\s*\}/i);
  if (boxedMatch) {
    return boxedMatch[1].toUpperCase();
  }

  const answerMatch = value.match(/\b(?:answer|option|choice)\s*[:\-]?\s*([A-Z])\b/i);
  if (answerMatch) {
    return answerMatch[1].toUpperCase();
  }

  const standalone = [...value.toUpperCase().matchAll(/\b([A-Z])\b/g)];
  if (standalone.length > 0) {
    return standalone[standalone.length - 1][1];
  }

  return null;
}

function numericValuesMatch(predicted: string, expected: string): boolean {
  const predictedNumber = Number(predicted);
  const expectedNumber = Number(expected);

  if (Number.isNaN(predictedNumber) || Number.isNaN(expectedNumber)) {
    return false;
  }

  return Math.abs(predictedNumber - expectedNumber) < 1e-9;
}

export class NumericEvaluator {
  readonly name = 'numeric' as const;

  evaluate(response: string, groundTruth: string): EvaluationResult {
    const expected = extractNumericAnswer(groundTruth) ?? groundTruth.trim();
    const predicted = extractNumericAnswer(response);

    return {
      correct:
        predicted !== null && expected.length > 0
          ? numericValuesMatch(predicted, expected)
          : false,
      expected,
      predicted,
    };
  }
}

export class MCQEvaluator {
  readonly name = 'mcq' as const;

  evaluate(response: string, groundTruth: string): EvaluationResult {
    const expected = (extractChoiceLetter(groundTruth) ?? groundTruth.trim()).toUpperCase();
    const predicted = extractChoiceLetter(response);

    return {
      correct: predicted !== null && expected.length > 0 ? predicted === expected : false,
      expected,
      predicted,
    };
  }
}

export type JudgeFunction = (args: {
  prompt?: string;
  response: string;
  groundTruth: string;
}) => Promise<boolean>;

export class GenerativeEvaluator {
  readonly name = 'generative' as const;
  private readonly judge: JudgeFunction;

  constructor(judge: JudgeFunction) {
    this.judge = judge;
  }

  async evaluate(
    response: string,
    groundTruth: string,
    prompt?: string,
  ): Promise<EvaluationResult> {
    const correct = await this.judge({ prompt, response, groundTruth });

    return {
      correct,
      expected: groundTruth.trim(),
      predicted: response.trim().length > 0 ? response.trim() : null,
    };
  }
}

export function createEvaluatorForDataset(
  datasetName: BenchmarkDatasetName | null,
): NumericEvaluator | MCQEvaluator | null {
  if (!datasetName) {
    return null;
  }

  if (datasetName === 'gsm8k') {
    return new NumericEvaluator();
  }

  if (datasetName === 'truthfulqa' || datasetName === 'gpqa') {
    return new MCQEvaluator();
  }

  return null;
}
