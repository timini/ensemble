import type { AIProvider } from '@ensemble-ai/shared-utils/providers';
import type {
  BenchmarkDatasetName,
  EvaluationResult,
} from '../types.js';
import { extractChoiceLetter, extractNumericAnswer } from './parsers.js';

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

const MCQ_JUDGE_PROMPT =
  'You are an answer extraction assistant. A student was asked a multiple-choice question with options A, B, C, D. Below is their response. Extract which single option letter (A, B, C, or D) the student selected.\n\nStudent response:\n';

const MCQ_ANSWER_SCHEMA = {
  name: 'mcq_answer',
  schema: {
    type: 'object' as const,
    properties: {
      answer: { type: 'string' as const, enum: ['A', 'B', 'C', 'D'] },
    },
    required: ['answer'],
    additionalProperties: false,
  },
};

export class LLMJudgeMCQEvaluator {
  readonly name = 'mcq' as const;

  constructor(
    private readonly provider: AIProvider,
    private readonly model: string,
  ) {}

  async evaluate(response: string, groundTruth: string): Promise<EvaluationResult> {
    const expected = (extractChoiceLetter(groundTruth) ?? groundTruth.trim()).toUpperCase();

    let predicted: string | null;
    try {
      const result = await this.provider.generateStructured<{ answer: string }>(
        MCQ_JUDGE_PROMPT + response,
        this.model,
        MCQ_ANSWER_SCHEMA,
        { temperature: 0 },
      );
      predicted = result.parsed.answer?.toUpperCase() ?? null;
    } catch {
      // Fall back to regex if judge call fails
      predicted = extractChoiceLetter(response);
    }

    return {
      correct: predicted !== null && expected.length > 0 ? predicted === expected : false,
      expected,
      predicted,
    };
  }
}

export interface JudgeConfig {
  provider: AIProvider;
  model: string;
}

export function createEvaluatorForDataset(
  datasetName: BenchmarkDatasetName | null,
  judge?: JudgeConfig,
): NumericEvaluator | MCQEvaluator | LLMJudgeMCQEvaluator | null {
  if (!datasetName) {
    return null;
  }

  switch (datasetName) {
    case 'gsm8k':
      return new NumericEvaluator();
    case 'truthfulqa':
    case 'gpqa':
      return judge
        ? new LLMJudgeMCQEvaluator(judge.provider, judge.model)
        : new MCQEvaluator();
    default: {
      const exhaustiveCheck: never = datasetName;
      return exhaustiveCheck;
    }
  }
}
