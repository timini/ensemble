import type {
  PromptEvaluation,
  ProviderResponse,
  SelfConsistencyResult,
} from '../types.js';

function pickMajority(values: string[]): { value: string | null; count: number } {
  if (values.length === 0) {
    return { value: null, count: 0 };
  }

  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let majorityValue: string | null = null;
  let majorityCount = 0;
  for (const [value, count] of counts.entries()) {
    if (count > majorityCount) {
      majorityValue = value;
      majorityCount = count;
    }
  }

  return { value: majorityValue, count: majorityCount };
}

export function buildSelfConsistencyResult(args: {
  runCount: number;
  responses: ProviderResponse[];
  evaluation?: PromptEvaluation;
}): SelfConsistencyResult | undefined {
  if (args.runCount <= 1) {
    return undefined;
  }

  const predicted = args.evaluation
    ? Object.values(args.evaluation.results)
        .map((result) => result.predicted)
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .map((value) => value.trim())
    : args.responses
        .filter((response) => !response.error && response.content.trim().length > 0)
        .map((response) => response.content.trim());

  const majority = pickMajority(predicted);
  const expected = args.evaluation?.groundTruth?.trim();
  const correct =
    expected && majority.value !== null
      ? majority.value.toUpperCase() === expected.toUpperCase()
      : null;

  return {
    runs: args.runCount,
    majorityAnswer: majority.value,
    majorityCount: majority.count,
    correct,
  };
}
