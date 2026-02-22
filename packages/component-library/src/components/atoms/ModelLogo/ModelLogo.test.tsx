import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelLogo, resolveModelLogoKey } from './ModelLogo';

const PROVIDERS = ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'perplexity'] as const;

describe('ModelLogo', () => {
  describe('rendering', () => {
    it.each(PROVIDERS)('renders %s model logo', (provider) => {
      render(<ModelLogo provider={provider} />);
      const logo = screen.getByTestId(`model-logo-${provider}`);
      expect(logo).toBeInTheDocument();
      expect(logo.querySelector('svg')).toBeInTheDocument();
    });

    it('uses Claude logo for Anthropic Claude models', () => {
      render(<ModelLogo provider="anthropic" modelName="Claude 3.7 Sonnet" />);
      expect(screen.getByTestId('model-logo-anthropic')).toHaveAttribute('data-logo-key', 'claude');
    });

    it('uses Gemini logo for Google Gemini models', () => {
      render(<ModelLogo provider="google" modelName="Gemini 2.5 Flash" />);
      expect(screen.getByTestId('model-logo-google')).toHaveAttribute('data-logo-key', 'gemini');
    });

    it('uses Grok logo for xAI Grok models', () => {
      render(<ModelLogo provider="xai" modelName="Grok 4" />);
      expect(screen.getByTestId('model-logo-xai')).toHaveAttribute('data-logo-key', 'grok');
    });
  });

  describe('fallback behavior', () => {
    it('falls back to Anthropic provider logo when model family is unknown', () => {
      render(<ModelLogo provider="anthropic" modelName="Sonnet Experimental" />);
      expect(screen.getByTestId('model-logo-anthropic')).toHaveAttribute('data-logo-key', 'anthropic');
    });

    it('falls back to DeepMind provider logo when Google model family is unknown', () => {
      render(<ModelLogo provider="google" modelName="PaLM Legacy" />);
      expect(screen.getByTestId('model-logo-google')).toHaveAttribute('data-logo-key', 'deepmind');
    });

    it('falls back to XAI provider logo when xAI model family is unknown', () => {
      render(<ModelLogo provider="xai" modelName="Reasoning Beta" />);
      expect(screen.getByTestId('model-logo-xai')).toHaveAttribute('data-logo-key', 'xai');
    });
  });

  describe('resolver', () => {
    it('resolves from model id when model name is unavailable', () => {
      expect(resolveModelLogoKey('anthropic', undefined, 'claude-opus-4')).toBe('claude');
      expect(resolveModelLogoKey('google', undefined, 'gemini-2.5-pro')).toBe('gemini');
      expect(resolveModelLogoKey('xai', undefined, 'grok-4')).toBe('grok');
    });
  });

  describe('sizes and accessibility', () => {
    it('renders default size when no size provided', () => {
      render(<ModelLogo provider="openai" />);
      expect(screen.getByTestId('model-logo-openai')).toHaveAttribute('data-size', 'default');
    });

    it('renders explicit size when provided', () => {
      render(<ModelLogo provider="openai" size="lg" />);
      expect(screen.getByTestId('model-logo-openai')).toHaveAttribute('data-size', 'lg');
    });

    it.each(PROVIDERS)('has accessible role and label for %s', (provider) => {
      render(<ModelLogo provider={provider} />);
      const logo = screen.getByTestId(`model-logo-${provider}`);
      expect(logo).toHaveAttribute('role', 'img');
      expect(logo).toHaveAttribute('aria-label', `${provider} model logo`);
    });
  });
});
