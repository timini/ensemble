import { describe, it, expect } from 'vitest';

import {
  EnsembleMetadataSchema,
  ModelResponseReferenceSchema,
  StandardConsensusResultSchema,
  EloRankingResultSchema,
  MajorityVotingResultSchema,
  LLMCouncilResultSchema,
  EnsembleResultSchema,
  parseEnsembleResult,
} from '../schemas';

import {
  isStandardResult,
  isEloResult,
  isMajorityResult,
  isCouncilResult,
} from '../types';

import type { EnsembleResult } from '../types';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const baseMetadata = {
  timestamp: '2026-01-15T10:30:00.000Z',
  prompt: 'What is the capital of France?',
  modelIds: ['model-a', 'model-b', 'model-c'],
  summarizerModel: 'model-a',
};

const sampleResponse = {
  modelId: 'model-a',
  provider: 'openai',
  model: 'gpt-4o',
  modelName: 'GPT-4o',
  content: 'The capital of France is Paris.',
  responseTime: 1234,
  tokenCount: 42,
};

const sampleResponseB = {
  ...sampleResponse,
  modelId: 'model-b',
  provider: 'anthropic',
  model: 'claude-3-opus',
  modelName: 'Claude 3 Opus',
};

// ---------------------------------------------------------------------------
// EnsembleMetadataSchema
// ---------------------------------------------------------------------------

describe('EnsembleMetadataSchema', () => {
  it('parses valid metadata', () => {
    const result = EnsembleMetadataSchema.safeParse({
      ...baseMetadata,
      schemaVersion: '1.0.0',
    });
    expect(result.success).toBe(true);
  });

  it('defaults schemaVersion to 1.0.0 when omitted', () => {
    const result = EnsembleMetadataSchema.safeParse(baseMetadata);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe('1.0.0');
    }
  });

  it('rejects missing required fields', () => {
    const result = EnsembleMetadataSchema.safeParse({ timestamp: '2026-01-15T10:30:00.000Z' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timestamp format', () => {
    const result = EnsembleMetadataSchema.safeParse({
      ...baseMetadata,
      timestamp: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ModelResponseReferenceSchema
// ---------------------------------------------------------------------------

describe('ModelResponseReferenceSchema', () => {
  it('parses a valid response reference', () => {
    const result = ModelResponseReferenceSchema.safeParse(sampleResponse);
    expect(result.success).toBe(true);
  });

  it('allows optional tokenCount to be omitted', () => {
    const { tokenCount: _, ...withoutTokenCount } = sampleResponse;
    void _;
    const result = ModelResponseReferenceSchema.safeParse(withoutTokenCount);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = ModelResponseReferenceSchema.safeParse({ modelId: 'x' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StandardConsensusResultSchema
// ---------------------------------------------------------------------------

describe('StandardConsensusResultSchema', () => {
  const validStandard = {
    ...baseMetadata,
    type: 'standard' as const,
    synthesis: 'Paris is the capital of France.',
    responses: [sampleResponse, sampleResponseB],
  };

  it('parses a valid standard result', () => {
    const result = StandardConsensusResultSchema.safeParse(validStandard);
    expect(result.success).toBe(true);
  });

  it('parses with optional sourceHighlights', () => {
    const result = StandardConsensusResultSchema.safeParse({
      ...validStandard,
      sourceHighlights: [{ modelId: 'model-a', highlight: 'Paris' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong type discriminator', () => {
    const result = StandardConsensusResultSchema.safeParse({
      ...validStandard,
      type: 'elo',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing synthesis', () => {
    const { synthesis: _, ...noSynthesis } = validStandard;
    void _;
    const result = StandardConsensusResultSchema.safeParse(noSynthesis);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EloRankingResultSchema
// ---------------------------------------------------------------------------

describe('EloRankingResultSchema', () => {
  const validElo = {
    ...baseMetadata,
    type: 'elo' as const,
    pairwiseComparisons: [
      { modelA: 'model-a', modelB: 'model-b', winner: 'model-a', reasoning: 'More complete answer.' },
    ],
    rankings: [
      { modelId: 'model-a', score: 1232, rank: 1 },
      { modelId: 'model-b', score: 1168, rank: 2 },
    ],
    topN: 2,
    synthesis: 'Paris is the capital of France.',
    responses: [sampleResponse, sampleResponseB],
  };

  it('parses a valid elo result', () => {
    const result = EloRankingResultSchema.safeParse(validElo);
    expect(result.success).toBe(true);
  });

  it('parses with optional tournamentBracket', () => {
    const result = EloRankingResultSchema.safeParse({
      ...validElo,
      tournamentBracket: { rounds: [] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing rankings', () => {
    const { rankings: _, ...noRankings } = validElo;
    void _;
    const result = EloRankingResultSchema.safeParse(noRankings);
    expect(result.success).toBe(false);
  });

  it('rejects missing pairwiseComparisons', () => {
    const { pairwiseComparisons: _, ...noPairwise } = validElo;
    void _;
    const result = EloRankingResultSchema.safeParse(noPairwise);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MajorityVotingResultSchema
// ---------------------------------------------------------------------------

describe('MajorityVotingResultSchema', () => {
  const validMajority = {
    ...baseMetadata,
    type: 'majority' as const,
    alignmentScores: [
      { modelId: 'model-a', score: 92 },
      { modelId: 'model-b', score: 85 },
    ],
    majorityModelId: 'model-a',
    agreementBreakdown: { unanimous: 0.7, majority: 0.2, split: 0.1 },
    synthesis: 'Paris is the capital of France.',
    responses: [sampleResponse, sampleResponseB],
  };

  it('parses a valid majority result', () => {
    const result = MajorityVotingResultSchema.safeParse(validMajority);
    expect(result.success).toBe(true);
  });

  it('rejects missing majorityModelId', () => {
    const { majorityModelId: _, ...noMajority } = validMajority;
    void _;
    const result = MajorityVotingResultSchema.safeParse(noMajority);
    expect(result.success).toBe(false);
  });

  it('rejects missing agreementBreakdown', () => {
    const { agreementBreakdown: _, ...noBreakdown } = validMajority;
    void _;
    const result = MajorityVotingResultSchema.safeParse(noBreakdown);
    expect(result.success).toBe(false);
  });

  it('rejects invalid agreementBreakdown shape', () => {
    const result = MajorityVotingResultSchema.safeParse({
      ...validMajority,
      agreementBreakdown: { unanimous: 'high' },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LLMCouncilResultSchema
// ---------------------------------------------------------------------------

describe('LLMCouncilResultSchema', () => {
  const validCouncil = {
    ...baseMetadata,
    type: 'council' as const,
    deliberationRounds: [
      {
        round: 1,
        statements: [
          { modelId: 'model-a', statement: 'I believe Paris.', position: 'agree' },
          { modelId: 'model-b', statement: 'I concur.', position: 'agree' },
        ],
      },
    ],
    finalVotes: [
      { modelId: 'model-a', vote: 'Paris', reasoning: 'Widely accepted fact.' },
      { modelId: 'model-b', vote: 'Paris', reasoning: 'Historical evidence.' },
    ],
    consensusMetrics: { agreementScore: 0.95, convergenceRate: 0.9, rounds: 1 },
    synthesis: 'Paris is the capital of France.',
    responses: [sampleResponse, sampleResponseB],
  };

  it('parses a valid council result', () => {
    const result = LLMCouncilResultSchema.safeParse(validCouncil);
    expect(result.success).toBe(true);
  });

  it('rejects missing deliberationRounds', () => {
    const { deliberationRounds: _, ...noRounds } = validCouncil;
    void _;
    const result = LLMCouncilResultSchema.safeParse(noRounds);
    expect(result.success).toBe(false);
  });

  it('rejects missing consensusMetrics', () => {
    const { consensusMetrics: _, ...noMetrics } = validCouncil;
    void _;
    const result = LLMCouncilResultSchema.safeParse(noMetrics);
    expect(result.success).toBe(false);
  });

  it('rejects invalid consensusMetrics shape', () => {
    const result = LLMCouncilResultSchema.safeParse({
      ...validCouncil,
      consensusMetrics: { agreementScore: 'high' },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EnsembleResultSchema (discriminated union)
// ---------------------------------------------------------------------------

describe('EnsembleResultSchema', () => {
  const validStandard = {
    ...baseMetadata,
    type: 'standard' as const,
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  const validElo = {
    ...baseMetadata,
    type: 'elo' as const,
    pairwiseComparisons: [
      { modelA: 'model-a', modelB: 'model-b', winner: 'model-a', reasoning: 'Better.' },
    ],
    rankings: [{ modelId: 'model-a', score: 1232, rank: 1 }],
    topN: 1,
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  const validMajority = {
    ...baseMetadata,
    type: 'majority' as const,
    alignmentScores: [{ modelId: 'model-a', score: 92 }],
    majorityModelId: 'model-a',
    agreementBreakdown: { unanimous: 1, majority: 0, split: 0 },
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  const validCouncil = {
    ...baseMetadata,
    type: 'council' as const,
    deliberationRounds: [
      { round: 1, statements: [{ modelId: 'model-a', statement: 'Paris.', position: 'agree' }] },
    ],
    finalVotes: [{ modelId: 'model-a', vote: 'Paris', reasoning: 'Fact.' }],
    consensusMetrics: { agreementScore: 1, convergenceRate: 1, rounds: 1 },
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  it('parses standard type', () => {
    expect(EnsembleResultSchema.safeParse(validStandard).success).toBe(true);
  });

  it('parses elo type', () => {
    expect(EnsembleResultSchema.safeParse(validElo).success).toBe(true);
  });

  it('parses majority type', () => {
    expect(EnsembleResultSchema.safeParse(validMajority).success).toBe(true);
  });

  it('parses council type', () => {
    expect(EnsembleResultSchema.safeParse(validCouncil).success).toBe(true);
  });

  it('rejects unknown type discriminator', () => {
    const result = EnsembleResultSchema.safeParse({
      ...validStandard,
      type: 'unknown',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing type field', () => {
    const { type: _, ...noType } = validStandard;
    void _;
    const result = EnsembleResultSchema.safeParse(noType);
    expect(result.success).toBe(false);
  });

  it('defaults schemaVersion when omitted via union', () => {
    const result = EnsembleResultSchema.safeParse(validStandard);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe('1.0.0');
    }
  });

  it('preserves unknown fields via passthrough (forward compatibility)', () => {
    const withExtra = { ...validStandard, futureField: 'hello', anotherOne: 42 };
    const result = EnsembleResultSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as Record<string, unknown>;
      expect(data['futureField']).toBe('hello');
      expect(data['anotherOne']).toBe(42);
    }
  });

  it('preserves unknown fields on nested response references', () => {
    const responseWithExtra = { ...sampleResponse, newMetric: 'fast' };
    const result = EnsembleResultSchema.safeParse({
      ...validStandard,
      responses: [responseWithExtra],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const resp = result.data.responses[0] as Record<string, unknown>;
      expect(resp['newMetric']).toBe('fast');
    }
  });
});

// ---------------------------------------------------------------------------
// parseEnsembleResult helper
// ---------------------------------------------------------------------------

describe('parseEnsembleResult', () => {
  const validStandard = {
    ...baseMetadata,
    type: 'standard',
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  it('returns success for valid JSON', () => {
    const result = parseEnsembleResult(validStandard);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('standard');
    }
  });

  it('returns failure for invalid JSON', () => {
    const result = parseEnsembleResult({ type: 'standard' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('returns failure for null input', () => {
    const result = parseEnsembleResult(null);
    expect(result.success).toBe(false);
  });

  it('returns failure for non-object input', () => {
    const result = parseEnsembleResult('not an object');
    expect(result.success).toBe(false);
  });

  it('provides descriptive error messages', () => {
    const result = parseEnsembleResult({ type: 'standard', timestamp: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe('Type guards', () => {
  const standardResult: EnsembleResult = {
    ...baseMetadata,
    schemaVersion: '1.0.0',
    type: 'standard',
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  const eloResult: EnsembleResult = {
    ...baseMetadata,
    schemaVersion: '1.0.0',
    type: 'elo',
    pairwiseComparisons: [
      { modelA: 'model-a', modelB: 'model-b', winner: 'model-a', reasoning: 'Better.' },
    ],
    rankings: [{ modelId: 'model-a', score: 1232, rank: 1 }],
    topN: 1,
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  const majorityResult: EnsembleResult = {
    ...baseMetadata,
    schemaVersion: '1.0.0',
    type: 'majority',
    alignmentScores: [{ modelId: 'model-a', score: 92 }],
    majorityModelId: 'model-a',
    agreementBreakdown: { unanimous: 1, majority: 0, split: 0 },
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  const councilResult: EnsembleResult = {
    ...baseMetadata,
    schemaVersion: '1.0.0',
    type: 'council',
    deliberationRounds: [
      { round: 1, statements: [{ modelId: 'model-a', statement: 'Paris.', position: 'agree' }] },
    ],
    finalVotes: [{ modelId: 'model-a', vote: 'Paris', reasoning: 'Fact.' }],
    consensusMetrics: { agreementScore: 1, convergenceRate: 1, rounds: 1 },
    synthesis: 'Paris.',
    responses: [sampleResponse],
  };

  it('isStandardResult returns true only for standard', () => {
    expect(isStandardResult(standardResult)).toBe(true);
    expect(isStandardResult(eloResult)).toBe(false);
    expect(isStandardResult(majorityResult)).toBe(false);
    expect(isStandardResult(councilResult)).toBe(false);
  });

  it('isEloResult returns true only for elo', () => {
    expect(isEloResult(eloResult)).toBe(true);
    expect(isEloResult(standardResult)).toBe(false);
    expect(isEloResult(majorityResult)).toBe(false);
    expect(isEloResult(councilResult)).toBe(false);
  });

  it('isMajorityResult returns true only for majority', () => {
    expect(isMajorityResult(majorityResult)).toBe(true);
    expect(isMajorityResult(standardResult)).toBe(false);
    expect(isMajorityResult(eloResult)).toBe(false);
    expect(isMajorityResult(councilResult)).toBe(false);
  });

  it('isCouncilResult returns true only for council', () => {
    expect(isCouncilResult(councilResult)).toBe(true);
    expect(isCouncilResult(standardResult)).toBe(false);
    expect(isCouncilResult(eloResult)).toBe(false);
    expect(isCouncilResult(majorityResult)).toBe(false);
  });

  it('narrows type correctly for standard (compile-time check)', () => {
    if (isStandardResult(standardResult)) {
      // This should compile without error - synthesis is accessible
      expect(standardResult.synthesis).toBe('Paris.');
    }
  });

  it('narrows type correctly for elo (compile-time check)', () => {
    if (isEloResult(eloResult)) {
      expect(eloResult.topN).toBe(1);
      expect(eloResult.rankings.length).toBeGreaterThan(0);
    }
  });

  it('narrows type correctly for majority (compile-time check)', () => {
    if (isMajorityResult(majorityResult)) {
      expect(majorityResult.majorityModelId).toBe('model-a');
      expect(majorityResult.agreementBreakdown.unanimous).toBe(1);
    }
  });

  it('narrows type correctly for council (compile-time check)', () => {
    if (isCouncilResult(councilResult)) {
      expect(councilResult.deliberationRounds.length).toBe(1);
      expect(councilResult.consensusMetrics.agreementScore).toBe(1);
    }
  });
});
