import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnsembleHeader } from './EnsembleHeader';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('EnsembleHeader', () => {
  it('renders the header with title', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('Ensemble AI')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('The smartest AI is an ensemble.')).toBeInTheDocument();
  });

  it('renders the brand name as a link to /config', () => {
    render(<EnsembleHeader />);
    const brandLink = screen.getByRole('link', { name: /ensemble ai/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute('href', '/config');
  });

  it('renders the settings button', () => {
    render(<EnsembleHeader />);
    const settingsButton = screen.getByRole('button', { name: /open settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('renders the About link', () => {
    render(<EnsembleHeader />);
    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute('href', '/about');
  });

  it('renders the Features link', () => {
    render(<EnsembleHeader />);
    const featuresLink = screen.getByRole('link', { name: /features/i });
    expect(featuresLink).toBeInTheDocument();
    expect(featuresLink).toHaveAttribute('href', '/features');
  });

  it('highlights the active Features link with aria-current and font-semibold', () => {
    render(<EnsembleHeader currentPath="/features" />);
    const featuresLink = screen.getByRole('link', { name: /features/i });
    expect(featuresLink).toHaveAttribute('aria-current', 'page');
    expect(featuresLink).toHaveClass('font-semibold');

    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).not.toHaveAttribute('aria-current');
  });

  it('highlights the active About link with aria-current and font-semibold', () => {
    render(<EnsembleHeader currentPath="/about" />);
    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toHaveAttribute('aria-current', 'page');
    expect(aboutLink).toHaveClass('font-semibold');

    const featuresLink = screen.getByRole('link', { name: /features/i });
    expect(featuresLink).not.toHaveAttribute('aria-current');
  });

  it('uses semantic header element', () => {
    const { container } = render(<EnsembleHeader />);
    expect(container.firstChild?.nodeName).toBe('HEADER');
  });

  it('wraps navigation links in a nav element', () => {
    render(<EnsembleHeader />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = render(<EnsembleHeader />);
    const header = container.firstChild;
    expect(header).toHaveClass('bg-background', 'border-b');
  });

  describe('snapshots', () => {
    it('matches snapshot for default render', () => {
      const { container } = render(<EnsembleHeader />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('internationalization', () => {
    it('renders English translations correctly', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      expect(screen.getByText('Ensemble AI')).toBeInTheDocument();
      expect(screen.getByText('The smartest AI is an ensemble.')).toBeInTheDocument();
    });

    it('renders French translations correctly', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      expect(screen.getByText('IA Ensemble')).toBeInTheDocument();
      expect(screen.getByText("L'IA la plus intelligente est un ensemble.")).toBeInTheDocument();
    });

    it('displays translated title in English', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('Ensemble AI');
    });

    it('displays translated title in French', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('IA Ensemble');
    });

    it('displays translated tagline in English', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });

      expect(screen.getByText('The smartest AI is an ensemble.')).toHaveClass('text-muted-foreground');
    });

    it('displays translated tagline in French', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });

      expect(screen.getByText("L'IA la plus intelligente est un ensemble.")).toHaveClass('text-muted-foreground');
    });
  });
});
