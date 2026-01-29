import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ModelCard } from './ModelCard';

describe('ModelCard Regression - Selection Highlighting', () => {
  it('applies explicit selection highlighting classes that override default card styles', () => {
    const { container } = render(
      <ModelCard 
        provider="openai" 
        modelName="GPT-4" 
        selected={true} 
        isSummarizer={false} 
      />
    );
    const card = container.querySelector('[data-testid="model-card"]');
    
    // Explicitly check for the highlighting classes
    expect(card).toHaveClass('border-blue-500');
    expect(card).toHaveClass('bg-blue-50');
    
    // Regression check: Ensure it doesn't just look like a default gray border
    expect(card).not.toHaveClass('border-gray-200');
  });

  it('applies explicit summarizer highlighting classes', () => {
    const { container } = render(
      <ModelCard 
        provider="anthropic" 
        modelName="Claude 3" 
        selected={true} 
        isSummarizer={true} 
      />
    );
    const card = container.querySelector('[data-testid="model-card"]');
    
    expect(card).toHaveClass('border-orange-500');
    expect(card).toHaveClass('bg-orange-50');
    
    expect(card).not.toHaveClass('border-gray-200');
    expect(card).not.toHaveClass('border-blue-500');
  });
});
