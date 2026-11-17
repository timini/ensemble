import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageIntro } from './PageIntro';

describe('PageIntro', () => {
  it('shows the eyebrow, the title as the h1 and the lead', () => {
    render(<PageIntro eyebrow="About" title="Why Ensemble exists" lead="Because." />);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Why Ensemble exists');
    expect(screen.getByTestId('page-intro-lead')).toHaveTextContent('Because.');
  });

  it('renders actions when given, and nothing extra otherwise', () => {
    const { rerender } = render(<PageIntro title="T" />);
    expect(screen.queryByTestId('page-intro-lead')).not.toBeInTheDocument();
    rerender(<PageIntro title="T"><a href="/workspace">Open</a></PageIntro>);
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/workspace');
  });
});
