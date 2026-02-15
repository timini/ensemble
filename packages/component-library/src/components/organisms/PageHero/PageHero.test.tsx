import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHero } from './PageHero';
import { renderWithI18n } from '../../../lib/test-utils/i18n-test-wrapper';

describe('PageHero', () => {
  describe('rendering', () => {
    it('renders title', () => {
      render(<PageHero title="Configure Your AI Ensemble" description="Test description" />);

      expect(screen.getByText('Configure Your AI Ensemble')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<PageHero title="Test Title" description="This is a test description" />);

      expect(screen.getByText('This is a test description')).toBeInTheDocument();
    });

    it('renders both title and description', () => {
      render(
        <PageHero
          title="Select Models to Create Your Ensemble"
          description="Choose the AI models you want to include"
        />
      );

      expect(screen.getByText('Select Models to Create Your Ensemble')).toBeInTheDocument();
      expect(screen.getByText('Choose the AI models you want to include')).toBeInTheDocument();
    });
  });

  describe('breadcrumb navigation', () => {
    it('renders breadcrumb items when provided', () => {
      render(
        <PageHero
          title="Test Title"
          description="Test description"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config', href: '/config' },
            { label: 'Ensemble', href: '/ensemble' },
          ]}
        />
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Config')).toBeInTheDocument();
      expect(screen.getByText('Ensemble')).toBeInTheDocument();
    });

    it('does not render breadcrumbs when not provided', () => {
      const { container } = render(
        <PageHero title="Test Title" description="Test description" />
      );

      const breadcrumbNav = container.querySelector('[aria-label="Breadcrumb"]');
      expect(breadcrumbNav).not.toBeInTheDocument();
    });

    it('renders breadcrumb links with correct hrefs', () => {
      render(
        <PageHero
          title="Test Title"
          description="Test description"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config', href: '/config' },
          ]}
        />
      );

      const homeLink = screen.getByText('Home').closest('a');
      const configLink = screen.getByText('Config').closest('a');

      expect(homeLink).toHaveAttribute('href', '/');
      expect(configLink).toHaveAttribute('href', '/config');
    });

    it('renders breadcrumb separators', () => {
      const { container } = render(
        <PageHero
          title="Test Title"
          description="Test description"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config', href: '/config' },
            { label: 'Ensemble', href: '/ensemble' },
          ]}
        />
      );

      const separators = container.querySelectorAll('[aria-hidden="true"]');
      // Should have separators between breadcrumb items (one less than total items)
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('layout', () => {
    it('uses centered text layout', () => {
      const { container } = render(
        <PageHero title="Test Title" description="Test description" />
      );

      const heroSection = container.querySelector('.text-center');
      expect(heroSection).toBeInTheDocument();
    });

    it('applies proper spacing classes', () => {
      const { container } = render(
        <PageHero title="Test Title" description="Test description" />
      );

      const heroSection = container.querySelector('.mb-8');
      expect(heroSection).toBeInTheDocument();
    });
  });

  describe('typography', () => {
    it('renders title with heading element', () => {
      render(<PageHero title="Configure Your AI Ensemble" description="Test description" />);

      const heading = screen.getByRole('heading', { name: 'Configure Your AI Ensemble' });
      expect(heading).toBeInTheDocument();
    });

    it('applies large font size to title', () => {
      render(<PageHero title="Test Title" description="Test description" />);

      const heading = screen.getByRole('heading');
      expect(heading).toHaveClass('text-3xl');
    });

    it('applies bold font weight to title', () => {
      render(<PageHero title="Test Title" description="Test description" />);

      const heading = screen.getByRole('heading');
      expect(heading).toHaveClass('font-bold');
    });
  });

  describe('accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<PageHero title="Configure Your AI Ensemble" description="Test description" />);

      const heading = screen.getByRole('heading');
      expect(heading.tagName).toBe('H1');
    });

    it('has accessible breadcrumb navigation', () => {
      render(
        <PageHero
          title="Test Title"
          description="Test description"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config', href: '/config' },
          ]}
        />
      );

      const breadcrumbNav = screen.getByRole('navigation');
      expect(breadcrumbNav).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('renders description as paragraph', () => {
      render(<PageHero title="Test Title" description="This is a test description" />);

      const description = screen.getByText('This is a test description');
      expect(description.tagName).toBe('P');
    });
  });

  describe('content variations', () => {
    it('handles long titles gracefully', () => {
      const longTitle =
        'Configure Your Comprehensive Multi-Model AI Ensemble System with Advanced Settings';
      render(<PageHero title={longTitle} description="Test description" />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles long descriptions gracefully', () => {
      const longDescription =
        'This is a comprehensive description that explains in great detail all the options available for configuring your AI ensemble.';
      render(<PageHero title="Test Title" description={longDescription} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('handles minimal content', () => {
      render(<PageHero title="Start" description="Go" />);

      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('Go')).toBeInTheDocument();
    });
  });

  describe('internationalization', () => {
    it('renders English breadcrumb label', () => {
      renderWithI18n(
        <PageHero
          title="Test Title"
          description="Test description"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config', href: '/config' },
          ]}
        />,
        { language: 'en' }
      );
      const breadcrumbNav = screen.getByRole('navigation');
      expect(breadcrumbNav).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('renders French breadcrumb label', () => {
      renderWithI18n(
        <PageHero
          title="Test Title"
          description="Test description"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config', href: '/config' },
          ]}
        />,
        { language: 'fr' }
      );
      const breadcrumbNav = screen.getByRole('navigation');
      expect(breadcrumbNav).toHaveAttribute('aria-label', 'Fil d\'Ariane');
    });
  });
});
