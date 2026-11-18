import type { AgreementPair } from './AgreementSummary';

/** Pairwise scores for the three sample answers. */
export const samplePairs: AgreementPair[] = [
  { a: 'GPT-6.1 Sol', b: 'Claude Opus 5.5', score: 0.91 },
  { a: 'GPT-6.1 Sol', b: 'Gemini 4 Carbon', score: 0.84 },
  { a: 'Claude Opus 5.5', b: 'Gemini 4 Carbon', score: 0.83 },
];
