import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders as a footer element', () => {
    const { container } = render(<Footer />);
    expect(container.firstChild?.nodeName).toBe('FOOTER');
  });

  it('renders navigation links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/config');
    expect(screen.getByRole('link', { name: /features/i })).toHaveAttribute('href', '/features');
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/about');
  });

  it('renders GitHub link with external attributes', () => {
    render(<Footer />);
    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders copyright notice with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('uses the data-testid', () => {
    render(<Footer />);
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
  });

  it('accepts custom GitHub URL', () => {
    render(<Footer githubUrl="https://github.com/custom/repo" />);
    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/custom/repo');
  });
});
