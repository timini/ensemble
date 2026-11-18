import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnsembleHeader } from './EnsembleHeader';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('EnsembleHeader', () => {
  it('renders the header with title', () => {
    render(<EnsembleHeader />);
    expect(screen.getByText('Ensemble AI')).toBeInTheDocument();
  });

  it('renders the brand name as a link to the landing page', () => {
    render(<EnsembleHeader />);
    const brandLink = screen.getByTestId('site-header-home');
    expect(brandLink).toHaveAttribute('href', '/');
    expect(brandLink).toHaveTextContent('Ensemble AI');
  });

  it('offers the workspace as the main action', () => {
    render(<EnsembleHeader />);
    const cta = screen.getByTestId('site-header-workspace');
    expect(cta).toHaveAttribute('href', '/workspace');
    expect(cta).toHaveTextContent('Open workspace');
  });

  it('links to the benchmarks', () => {
    render(<EnsembleHeader />);
    expect(screen.getByRole('link', { name: 'Benchmarks' })).toHaveAttribute('href', '/benchmarks');
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

    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).not.toHaveAttribute('aria-current');
  });

  it('highlights the active About link with aria-current', () => {
    render(<EnsembleHeader currentPath="/about" />);
    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toHaveAttribute('aria-current', 'page');

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

  it('renders as semantic header element', () => {
    const { container } = render(<EnsembleHeader />);
    const header = container.firstChild;
    expect(header?.nodeName).toBe('HEADER');
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
      expect(screen.getByTestId('site-header-home')).toHaveTextContent('Ensemble AI');
      expect(screen.getByTestId('site-header-workspace')).toHaveTextContent('Open workspace');
    });

    it('renders French translations correctly', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'fr' });
      expect(screen.getByTestId('site-header-home')).toHaveTextContent('IA Ensemble');
      expect(screen.getByTestId('site-header-workspace')).toHaveTextContent('Ouvrir l’espace de travail');
    });

    it('leaves the page heading to the page', () => {
      renderWithI18n(<EnsembleHeader />, { language: 'en' });
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });
  });
});
