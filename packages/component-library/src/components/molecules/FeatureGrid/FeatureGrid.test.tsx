import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureGrid } from './FeatureGrid';

const items = [
  { id: 'a', title: 'Answers side by side', body: 'Two to six models.' },
  { id: 'b', title: 'Agreement score', body: 'Pair by pair.' },
];

describe('FeatureGrid', () => {
  it('renders the heading, intro and one item per entry', () => {
    render(<FeatureGrid heading="Ask and compare" intro="What a run gives you." items={items} testId="core" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ask and compare');
    expect(screen.getByText('What a run gives you.')).toBeInTheDocument();
    expect(screen.getAllByTestId('core-item')).toHaveLength(2);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Answers side by side', 'Agreement score']);
  });

  it('uses two columns when asked', () => {
    render(<FeatureGrid heading="H" items={items} columns={2} />);
    expect(screen.getByRole('list')).toHaveClass('md:grid-cols-2');
  });

  it('renders extra content after the items', () => {
    render(<FeatureGrid heading="H" items={items}><a href="/benchmarks">See the benchmarks</a></FeatureGrid>);
    expect(screen.getByRole('link', { name: 'See the benchmarks' })).toBeInTheDocument();
  });
});
