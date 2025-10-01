import type { Meta, StoryObj } from '@storybook/react';
import { ConsensusCard } from './ConsensusCard';

const meta = {
  title: 'Organisms/ConsensusCard',
  component: ConsensusCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    heading: {
      control: 'text',
      description: 'Heading text for the consensus section',
    },
    onShare: {
      action: 'shared',
      description: 'Callback when share button is clicked',
    },
  },
} satisfies Meta<typeof ConsensusCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story - matching wireframe
export const Default: Story = {
  args: {
    consensusText:
      'Your question has a clear focus that allows for a direct response. We can examine this through multiple lenses: theoretical foundations, real-world examples, and future considerations. This comprehensive approach ensures that all relevant factors are taken into account when formulating a complete response.',
    summarizerModel: 'Claude 3 Opus',
    onShare: () => console.log('Share clicked'),
  },
};

// Short consensus
export const ShortConsensus: Story = {
  args: {
    consensusText: 'This is a straightforward topic with a direct answer.',
    summarizerModel: 'Claude 3 Opus',
    onShare: () => console.log('Share clicked'),
  },
};

// Long consensus
export const LongConsensus: Story = {
  args: {
    consensusText:
      'Your question has a clear focus that allows for a detailed and comprehensive response. We can examine this through multiple lenses: theoretical foundations that provide the conceptual framework, real-world examples that demonstrate practical applications, historical context that shows evolution over time, current best practices that reflect modern understanding, and future considerations that anticipate upcoming developments. This multi-faceted comprehensive approach ensures that all relevant factors are taken into account when formulating a complete response. By considering each of these dimensions, we can provide a thorough analysis that addresses the question from various angles and provides a well-rounded understanding of the topic at hand. The integration of these different perspectives creates a more robust and nuanced answer that considers both breadth and depth of understanding.',
    summarizerModel: 'Claude 3 Opus',
    onShare: () => console.log('Share clicked'),
  },
};

// Different summarizer model
export const DifferentModel: Story = {
  args: {
    consensusText:
      'The analysis reveals several key insights. By examining patterns and drawing conclusions, we can better understand the underlying dynamics at play.',
    summarizerModel: 'GPT-4 Turbo',
    onShare: () => console.log('Share clicked'),
  },
};

// Custom heading
export const CustomHeading: Story = {
  args: {
    consensusText:
      'Your question has a clear focus that allows for a direct response. We can examine this through multiple lenses: theoretical foundations, real-world examples, and future considerations.',
    summarizerModel: 'Claude 3 Opus',
    heading: 'Synthesized Response',
    onShare: () => console.log('Share clicked'),
  },
};

// Without onShare handler
export const WithoutShareHandler: Story = {
  args: {
    consensusText:
      'Your question has a clear focus that allows for a direct response. We can examine this through multiple lenses: theoretical foundations, real-world examples, and future considerations.',
    summarizerModel: 'Claude 3 Opus',
  },
};

// Technical consensus
export const TechnicalConsensus: Story = {
  args: {
    consensusText:
      'The implementation requires careful consideration of architectural patterns, data structures, and algorithmic complexity. Optimal performance can be achieved through caching strategies, lazy loading, and efficient memory management. Error handling and edge cases must be thoroughly addressed to ensure system reliability.',
    summarizerModel: 'Claude 3 Sonnet',
    onShare: () => console.log('Share clicked'),
  },
};

// Creative consensus
export const CreativeConsensus: Story = {
  args: {
    consensusText:
      'The narrative weaves together themes of hope and resilience, creating a tapestry of human experience. Through vivid imagery and emotional depth, the story explores the complexities of relationships and the power of personal transformation.',
    summarizerModel: 'Claude 3 Opus',
    onShare: () => console.log('Share clicked'),
  },
};

// With multiline text
export const MultilineConsensus: Story = {
  args: {
    consensusText:
      'First key point: The foundation is built on solid principles.\n\nSecond key point: Implementation requires careful planning.\n\nThird key point: Results should be measured and validated.',
    summarizerModel: 'Claude 3 Opus',
    onShare: () => console.log('Share clicked'),
  },
};
