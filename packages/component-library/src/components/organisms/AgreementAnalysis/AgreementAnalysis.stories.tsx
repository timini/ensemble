import type { Meta, StoryObj } from '@storybook/react';
import { AgreementAnalysis } from './AgreementAnalysis';

const meta = {
  title: 'Organisms/AgreementAnalysis',
  component: AgreementAnalysis,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    overallAgreement: {
      description: 'Overall agreement percentage (0-1)',
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
    },
    pairwiseComparisons: {
      description: 'Array of pairwise comparisons between models',
    },
    responseCount: {
      description: 'Number of responses analyzed',
    },
    comparisonCount: {
      description: 'Number of pairwise comparisons',
    },
    averageConfidence: {
      description: 'Average confidence percentage (0-1)',
    },
  },
} satisfies Meta<typeof AgreementAnalysis>;

export default meta;
type Story = StoryObj<typeof meta>;

// Low agreement (< 0.5)
export const LowAgreement: Story = {
  args: {
    overallAgreement: 0.56,
    pairwiseComparisons: [
      {
        model1: 'Claude 3 Haiku',
        model2: 'Claude 3 Opus',
        similarity: 0.56,
        confidence: 0.95,
      },
    ],
    responseCount: 2,
    comparisonCount: 1,
    averageConfidence: 0.95,
  },
};

// Medium agreement (0.5-0.8)
export const MediumAgreement: Story = {
  args: {
    overallAgreement: 0.68,
    pairwiseComparisons: [
      {
        model1: 'GPT-4',
        model2: 'Claude 3 Opus',
        similarity: 0.72,
        confidence: 0.93,
      },
      {
        model1: 'GPT-4',
        model2: 'Gemini Pro',
        similarity: 0.65,
        confidence: 0.91,
      },
      {
        model1: 'Claude 3 Opus',
        model2: 'Gemini Pro',
        similarity: 0.67,
        confidence: 0.94,
      },
    ],
    responseCount: 3,
    comparisonCount: 3,
    averageConfidence: 0.93,
  },
};

// High agreement (> 0.8)
export const HighAgreement: Story = {
  args: {
    overallAgreement: 0.89,
    pairwiseComparisons: [
      {
        model1: 'GPT-4',
        model2: 'Claude 3 Opus',
        similarity: 0.92,
        confidence: 0.96,
      },
      {
        model1: 'GPT-4',
        model2: 'Gemini Pro',
        similarity: 0.87,
        confidence: 0.94,
      },
      {
        model1: 'Claude 3 Opus',
        model2: 'Gemini Pro',
        similarity: 0.88,
        confidence: 0.95,
      },
    ],
    responseCount: 3,
    comparisonCount: 3,
    averageConfidence: 0.95,
  },
};

// Two responses
export const TwoResponses: Story = {
  args: {
    overallAgreement: 0.78,
    pairwiseComparisons: [
      {
        model1: 'GPT-4',
        model2: 'Claude 3 Opus',
        similarity: 0.78,
        confidence: 0.92,
      },
    ],
    responseCount: 2,
    comparisonCount: 1,
    averageConfidence: 0.92,
  },
};

// Four responses
export const FourResponses: Story = {
  args: {
    overallAgreement: 0.71,
    pairwiseComparisons: [
      {
        model1: 'GPT-4',
        model2: 'Claude 3 Opus',
        similarity: 0.75,
        confidence: 0.94,
      },
      {
        model1: 'GPT-4',
        model2: 'Gemini Pro',
        similarity: 0.68,
        confidence: 0.91,
      },
      {
        model1: 'GPT-4',
        model2: 'Grok 1',
        similarity: 0.72,
        confidence: 0.89,
      },
      {
        model1: 'Claude 3 Opus',
        model2: 'Gemini Pro',
        similarity: 0.71,
        confidence: 0.93,
      },
      {
        model1: 'Claude 3 Opus',
        model2: 'Grok 1',
        similarity: 0.69,
        confidence: 0.90,
      },
      {
        model1: 'Gemini Pro',
        model2: 'Grok 1',
        similarity: 0.73,
        confidence: 0.92,
      },
    ],
    responseCount: 4,
    comparisonCount: 6,
    averageConfidence: 0.92,
  },
};

// Six responses (maximum ensemble size)
export const SixResponses: Story = {
  args: {
    overallAgreement: 0.64,
    pairwiseComparisons: [
      { model1: 'GPT-4', model2: 'GPT-4 Turbo', similarity: 0.82, confidence: 0.96 },
      { model1: 'GPT-4', model2: 'Claude 3 Opus', similarity: 0.71, confidence: 0.93 },
      { model1: 'GPT-4', model2: 'Claude 3 Sonnet', similarity: 0.68, confidence: 0.91 },
      { model1: 'GPT-4', model2: 'Gemini Pro', similarity: 0.65, confidence: 0.89 },
      { model1: 'GPT-4', model2: 'Grok 1', similarity: 0.58, confidence: 0.87 },
      { model1: 'GPT-4 Turbo', model2: 'Claude 3 Opus', similarity: 0.69, confidence: 0.92 },
      { model1: 'GPT-4 Turbo', model2: 'Claude 3 Sonnet', similarity: 0.66, confidence: 0.90 },
      { model1: 'GPT-4 Turbo', model2: 'Gemini Pro', similarity: 0.63, confidence: 0.88 },
      { model1: 'GPT-4 Turbo', model2: 'Grok 1', similarity: 0.56, confidence: 0.86 },
      { model1: 'Claude 3 Opus', model2: 'Claude 3 Sonnet', similarity: 0.78, confidence: 0.95 },
      { model1: 'Claude 3 Opus', model2: 'Gemini Pro', similarity: 0.67, confidence: 0.91 },
      { model1: 'Claude 3 Opus', model2: 'Grok 1', similarity: 0.61, confidence: 0.88 },
      { model1: 'Claude 3 Sonnet', model2: 'Gemini Pro', similarity: 0.64, confidence: 0.90 },
      { model1: 'Claude 3 Sonnet', model2: 'Grok 1', similarity: 0.59, confidence: 0.87 },
      { model1: 'Gemini Pro', model2: 'Grok 1', similarity: 0.62, confidence: 0.89 },
    ],
    responseCount: 6,
    comparisonCount: 15,
    averageConfidence: 0.90,
  },
};

// Edge case: Perfect agreement
export const PerfectAgreement: Story = {
  args: {
    overallAgreement: 1.0,
    pairwiseComparisons: [
      {
        model1: 'GPT-4',
        model2: 'Claude 3 Opus',
        similarity: 1.0,
        confidence: 0.99,
      },
    ],
    responseCount: 2,
    comparisonCount: 1,
    averageConfidence: 0.99,
  },
};

// Edge case: No agreement
export const NoAgreement: Story = {
  args: {
    overallAgreement: 0.12,
    pairwiseComparisons: [
      {
        model1: 'GPT-4',
        model2: 'Claude 3 Opus',
        similarity: 0.12,
        confidence: 0.85,
      },
    ],
    responseCount: 2,
    comparisonCount: 1,
    averageConfidence: 0.85,
  },
};
