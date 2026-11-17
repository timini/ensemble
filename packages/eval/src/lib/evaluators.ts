import type { AIProvider } from '@ensemble-ai/shared-utils/providers';
import type {
  BenchmarkDatasetName,
  EvaluationResult,
  ModelSpec,
} from '../types.js';
import { extractChoiceLetter, extractNumericAnswer } from './parsers.js';
import { answersMatch, choicesFromPrompt, extractFinalAnswer, type AnswerKind, type AnswerSpec } from './finalAnswer.js';
import type { AnswerProtocol } from './methodology.js';
import { formatModelSpec, sameModel } from './modelSpecs.js';

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

const NUMERIC_JUDGE_PROMPT =
  'You are a math answer extraction assistant. A student solved a math problem. Extract the final numeric answer from their response. Return only the number, without units, commas, or extra text.\n\nStudent response:\n';

const NUMERIC_ANSWER_SCHEMA = {
  name: 'numeric_answer',
  schema: {
    type: 'object' as const,
    properties: {
      answer: { type: 'string' as const },
    },
    required: ['answer'],
    additionalProperties: false,
  },
};

export class LLMJudgeNumericEvaluator {
  readonly name = 'numeric' as const;

  constructor(
    private readonly provider: AIProvider,
    private readonly model: string,
  ) {}

  async evaluate(response: string, groundTruth: string): Promise<EvaluationResult> {
    const expected = extractNumericAnswer(groundTruth) ?? groundTruth.trim();

    let predicted: string | null;
    const start = Date.now();
    process.stderr.write(`    [judge-numeric] start generateStructured model=${this.model}\n`);
    try {
      const result = await this.provider.generateStructured<{ answer: string }>(
        NUMERIC_JUDGE_PROMPT + response,
        this.model,
        NUMERIC_ANSWER_SCHEMA,
        { temperature: 0 },
      );
      predicted = result.parsed.answer ?? null;
      process.stderr.write(`    [judge-numeric] done in ${((Date.now() - start) / 1000).toFixed(1)}s predicted=${predicted}\n`);
    } catch (err) {
      predicted = null;
      process.stderr.write(`    [judge-numeric] error in ${((Date.now() - start) / 1000).toFixed(1)}s: ${err instanceof Error ? err.message : String(err)}\n`);
    }

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

const MCQ_JUDGE_PROMPT =
  'You are an answer extraction assistant. A student was asked a multiple-choice question. Below is their response. Extract which single option letter the student selected.\n\nStudent response:\n';

const MCQ_ANSWER_SCHEMA = {
  name: 'mcq_answer',
  schema: {
    type: 'object' as const,
    properties: {
      answer: { type: 'string' as const, enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
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
    const start = Date.now();
    process.stderr.write(`    [judge-mcq] start generateStructured model=${this.model}\n`);
    try {
      const result = await this.provider.generateStructured<{ answer: string }>(
        MCQ_JUDGE_PROMPT + response,
        this.model,
        MCQ_ANSWER_SCHEMA,
        { temperature: 0 },
      );
      predicted = result.parsed.answer?.toUpperCase() ?? null;
      process.stderr.write(`    [judge-mcq] done in ${((Date.now() - start) / 1000).toFixed(1)}s predicted=${predicted}\n`);
    } catch (err) {
      predicted = null;
      process.stderr.write(`    [judge-mcq] error in ${((Date.now() - start) / 1000).toFixed(1)}s: ${err instanceof Error ? err.message : String(err)}\n`);
    }

    return {
      correct: predicted !== null && expected.length > 0 ? predicted === expected : false,
      expected,
      predicted,
    };
  }
}

const EXACT_MATCH_JUDGE_PROMPT =
  'You are an answer comparison assistant. Compare the student\'s answer to the correct answer. Determine if they are equivalent (allowing for minor formatting differences, equivalent expressions, etc.).\n\nCorrect answer:\n';

const EXACT_MATCH_ANSWER_SCHEMA = {
  name: 'exact_match_answer',
  schema: {
    type: 'object' as const,
    properties: {
      equivalent: { type: 'boolean' as const },
      extracted_answer: { type: 'string' as const },
    },
    required: ['equivalent', 'extracted_answer'],
    additionalProperties: false,
  },
};

export class LLMJudgeExactMatchEvaluator {
  readonly name = 'exact-match' as const;

  constructor(
    private readonly provider: AIProvider,
    private readonly model: string,
  ) {}

  async evaluate(response: string, groundTruth: string): Promise<EvaluationResult> {
    let equivalent = false;
    let predicted: string | null;
    const start = Date.now();
    process.stderr.write(`    [judge-exact] start generateStructured model=${this.model}\n`);
    try {
      const result = await this.provider.generateStructured<{
        equivalent: boolean;
        extracted_answer: string;
      }>(
        EXACT_MATCH_JUDGE_PROMPT +
          groundTruth +
          '\n\nStudent response:\n' +
          response,
        this.model,
        EXACT_MATCH_ANSWER_SCHEMA,
        { temperature: 0 },
      );
      equivalent = result.parsed.equivalent ?? false;
      predicted = result.parsed.extracted_answer ?? null;
      process.stderr.write(`    [judge-exact] done in ${((Date.now() - start) / 1000).toFixed(1)}s equivalent=${equivalent}\n`);
    } catch (err) {
      predicted = null;
      process.stderr.write(`    [judge-exact] error in ${((Date.now() - start) / 1000).toFixed(1)}s: ${err instanceof Error ? err.message : String(err)}\n`);
    }

    return {
      correct: equivalent,
      expected: groundTruth.trim(),
      predicted,
    };
  }
}

export interface JudgeConfig {
  provider: AIProvider;
  model: string;
}

const MECHANICAL_NAMES: Record<Exclude<AnswerKind, 'text'>, 'mcq' | 'numeric' | 'exact-match'> = {
  choice: 'mcq',
  numeric: 'numeric',
  math: 'exact-match',
  yesno: 'exact-match',
};

/**
 * Scores a structured final answer with no LLM: reads the answer
 * (extractFinalAnswer) and compares it for its kind (answersMatch). For
 * choice answers the option letters come from the prompt's answer
 * instruction, so a letter outside the options is not read as an answer.
 */
export class MechanicalEvaluator {
  readonly name: 'mcq' | 'numeric' | 'exact-match';

  constructor(private readonly kind: Exclude<AnswerKind, 'text'>) {
    this.name = MECHANICAL_NAMES[kind];
  }

  evaluate(response: string, groundTruth: string, prompt?: string): EvaluationResult {
    const choices = this.kind === 'choice' ? choicesFromPrompt(prompt) : undefined;
    const spec: AnswerSpec = choices ? { kind: this.kind, choices } : { kind: this.kind };
    const predicted = extractFinalAnswer(response, spec);
    const expected = groundTruth.trim();
    return { correct: answersMatch(predicted, expected, spec), expected, predicted };
  }
}

const STRUCTURED_KIND: Partial<Record<BenchmarkDatasetName, Exclude<AnswerKind, 'text'>>> = {
  truthfulqa: 'choice',
  gpqa: 'choice',
  mmlu_pro: 'choice',
  arc: 'choice',
  hellaswag: 'choice',
  gsm8k: 'numeric',
  math500: 'math',
  hallumix: 'yesno',
};

/** True when scoring this dataset under this protocol calls an LLM judge. */
export function datasetNeedsJudge(datasetName: BenchmarkDatasetName, protocol: AnswerProtocol): boolean {
  if (protocol === 'structured') return STRUCTURED_KIND[datasetName] === undefined;
  // Legacy scoring uses the LLM judge for every dataset, GSM8K and MATH-500 included,
  // as the committed single-baseline caches were scored.
  return true;
}

/**
 * Refuse a judge that also generates answers: a model grading its own
 * answers biases the score. Pass `allowSameModel` to force it.
 */
export function assertIndependentJudge(
  judge: ModelSpec,
  generators: readonly ModelSpec[],
  options: { allowSameModel?: boolean } = {},
): void {
  if (options.allowSameModel) return;
  if (generators.some((generator) => sameModel(generator, judge))) {
    throw new Error(
      `Judge model ${formatModelSpec(judge)} also generates answers. Pick a different judge, ` +
        'or pass --allow-same-judge to force it.',
    );
  }
}

export interface EvaluatorOptions {
  /** Defaults to `legacy`, the protocol of the committed caches. */
  protocol?: AnswerProtocol;
}

export function createEvaluatorForDataset(
  datasetName: BenchmarkDatasetName | null,
  judge?: JudgeConfig,
  options: EvaluatorOptions = {},
):
  | NumericEvaluator
  | MechanicalEvaluator
  | LLMJudgeNumericEvaluator
  | LLMJudgeMCQEvaluator
  | LLMJudgeExactMatchEvaluator
  | null {
  if (!datasetName) {
    return null;
  }

  if (options.protocol === 'structured') {
    const kind = STRUCTURED_KIND[datasetName];
    if (kind) return new MechanicalEvaluator(kind);
    if (!judge) {
      throw new Error(`${datasetName} dataset requires a judge config`);
    }
    return new LLMJudgeExactMatchEvaluator(judge.provider, judge.model);
  }
  switch (datasetName) {
    case 'gsm8k':
    case 'math500':
      return judge
        ? new LLMJudgeNumericEvaluator(judge.provider, judge.model)
        : new NumericEvaluator();
    case 'truthfulqa':
    case 'gpqa':
    case 'mmlu_pro':
    case 'arc':
    case 'hellaswag':
      if (!judge) {
        throw new Error('MCQ datasets require a judge config');
      }
      return new LLMJudgeMCQEvaluator(judge.provider, judge.model);
    case 'hle':
    case 'simpleqa':
    case 'hallumix':
      if (!judge) {
        throw new Error(`${datasetName} dataset requires a judge config`);
      }
      return new LLMJudgeExactMatchEvaluator(judge.provider, judge.model);
    default: {
      const exhaustiveCheck: never = datasetName;
      return exhaustiveCheck;
    }
  }
}
