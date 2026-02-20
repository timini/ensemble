import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderLogo } from './ProviderLogo';

const PROVIDERS = ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'perplexity'] as const;

describe('ProviderLogo', () => {
  describe('rendering', () => {
    it.each(PROVIDERS)('renders %s provider logo', (provider) => {
      render(<ProviderLogo provider={provider} />);
      const logo = screen.getByTestId(`provider-logo-${provider}`);
      expect(logo).toBeInTheDocument();
    });

    it.each(PROVIDERS)('renders SVG for %s provider', (provider) => {
      render(<ProviderLogo provider={provider} />);
      const logo = screen.getByTestId(`provider-logo-${provider}`);
      expect(logo.querySelector('svg')).toBeInTheDocument();
    });

    it.each(PROVIDERS)('sets data-provider attribute for %s', (provider) => {
      render(<ProviderLogo provider={provider} />);
      const logo = screen.getByTestId(`provider-logo-${provider}`);
      expect(logo).toHaveAttribute('data-provider', provider);
    });
  });

  describe('sizes', () => {
    it('renders default size', () => {
      render(<ProviderLogo provider="openai" />);
      const logo = screen.getByTestId('provider-logo-openai');
      expect(logo).toHaveAttribute('data-size', 'default');
    });

    it('renders sm size', () => {
      render(<ProviderLogo provider="openai" size="sm" />);
      const logo = screen.getByTestId('provider-logo-openai');
      expect(logo).toHaveAttribute('data-size', 'sm');
    });

    it('renders lg size', () => {
      render(<ProviderLogo provider="openai" size="lg" />);
      const logo = screen.getByTestId('provider-logo-openai');
      expect(logo).toHaveAttribute('data-size', 'lg');
    });

    it('renders xl size', () => {
      render(<ProviderLogo provider="openai" size="xl" />);
      const logo = screen.getByTestId('provider-logo-openai');
      expect(logo).toHaveAttribute('data-size', 'xl');
    });
  });

  describe('accessibility', () => {
    it.each(PROVIDERS)('has role img for %s', (provider) => {
      render(<ProviderLogo provider={provider} />);
      const logo = screen.getByTestId(`provider-logo-${provider}`);
      expect(logo).toHaveAttribute('role', 'img');
    });

    it.each(PROVIDERS)('has aria-label for %s', (provider) => {
      render(<ProviderLogo provider={provider} />);
      const logo = screen.getByTestId(`provider-logo-${provider}`);
      expect(logo).toHaveAttribute('aria-label', `${provider} logo`);
    });
  });

  describe('custom props', () => {
    it('accepts custom className', () => {
      render(<ProviderLogo provider="openai" className="custom-class" />);
      const logo = screen.getByTestId('provider-logo-openai');
      expect(logo.className).toContain('custom-class');
    });
  });
});
